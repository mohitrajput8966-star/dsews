import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";
import { asyncHandler, AppError } from "../utils/errors";
import { writeAuditLog } from "../services/audit.service";

const USER_ROLES = [
  "ADMIN",
  "SUPPLY_CHAIN_MANAGER",
  "PHARMACY_MANAGER",
  "PROCUREMENT_OFFICER",
  "WAREHOUSE_MANAGER",
  "HOSPITAL_ADMIN",
  "EXECUTIVE",
] as const;

function toPublicUser<
  T extends {
    id: string;
    email: string;
    name: string;
    role: string;
    phone: string | null;
    locationId: string | null;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
  }
>(user: T) {
  const { id, email, name, role, phone, locationId, isActive, createdAt, lastLoginAt } = user;
  return { id, email, name, role, phone, locationId, isActive, createdAt, lastLoginAt };
}

/** ADMIN only. Org-scoped user directory for Settings -> Users. */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { orgId: req.user!.orgId },
    include: { location: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({
    users: users.map((u) => ({ ...toPublicUser(u), locationName: u.location?.name ?? null })),
  });
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(USER_ROLES),
  locationId: z.string().nullable().optional(),
  password: z.string().min(8).default("Demo@123"),
});

/** ADMIN only. Academic-prototype user creation — no email invitation infrastructure, admin sets the initial password directly. */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const input = createUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new AppError(409, "A user with this email already exists.");

  if (input.locationId) {
    const location = await prisma.location.findFirst({ where: { id: input.locationId, orgId: req.user!.orgId } });
    if (!location) throw new AppError(400, "Invalid location.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      orgId: req.user!.orgId,
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      locationId: input.locationId ?? null,
      passwordHash,
    },
  });

  await writeAuditLog({
    orgId: req.user!.orgId,
    userId: req.user!.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    newValue: toPublicUser(user),
  });

  res.status(201).json({ user: toPublicUser(user) });
});

const updateUserSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  locationId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

/** ADMIN only. Changes role/location/active-status for another user in the same org. */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const input = updateUserSchema.parse(req.body);
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId } });
  if (!existing) throw new AppError(404, "User not found.");

  if (existing.id === req.user!.id && input.role && input.role !== existing.role) {
    throw new AppError(400, "You cannot change your own role. Ask another admin to do this.");
  }
  if (existing.id === req.user!.id && input.isActive === false) {
    throw new AppError(400, "You cannot deactivate your own account.");
  }

  const user = await prisma.user.update({ where: { id: existing.id }, data: input });

  await writeAuditLog({
    orgId: req.user!.orgId,
    userId: req.user!.id,
    action: input.role ? "USER_ROLE_CHANGED" : input.isActive === false ? "USER_DEACTIVATED" : input.isActive === true ? "USER_ACTIVATED" : "USER_UPDATED",
    entityType: "User",
    entityId: user.id,
    oldValue: toPublicUser(existing),
    newValue: toPublicUser(user),
  });

  res.json({ user: toPublicUser(user) });
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  locationId: z.string().nullable().optional(),
});

/** Any authenticated user. Self-service profile edit — deliberately excludes `role` (see section 4). */
export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = updateProfileSchema.parse(req.body);

  if (input.locationId) {
    const location = await prisma.location.findFirst({ where: { id: input.locationId, orgId: req.user!.orgId } });
    if (!location) throw new AppError(400, "Invalid location.");
  }

  const before = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: input });

  await writeAuditLog({
    orgId: req.user!.orgId,
    userId: req.user!.id,
    action: "PROFILE_UPDATED",
    entityType: "User",
    entityId: user.id,
    oldValue: toPublicUser(before),
    newValue: toPublicUser(user),
  });

  res.json({ user: toPublicUser(user) });
});
