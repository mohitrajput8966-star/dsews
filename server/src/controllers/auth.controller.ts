import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken } from "../utils/auth";
import { asyncHandler, AppError } from "../utils/errors";
import { writeAuditLog } from "../services/audit.service";
import { DEFAULT_ORG_POLICY, type UserRole } from "@dsews/shared";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
  locationId: string | null;
  phone: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    locationId: user.locationId,
    phone: user.phone,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    throw new AppError(401, "Invalid email or password.");
  }
  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    throw new AppError(401, "Invalid email or password.");
  }

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: user.orgId } });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAuditLog({
    orgId: user.orgId,
    userId: user.id,
    action: "USER_LOGGED_IN",
    entityType: "User",
    entityId: user.id,
  });

  const token = signToken({ userId: user.id, orgId: user.orgId, role: user.role as UserRole, locationId: user.locationId });

  res.json({
    token,
    user: toPublicUser(user),
    organization,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Stateless JWT: nothing to invalidate server-side in this prototype. We still
  // record the action for the audit trail and let the client discard its token.
  if (req.user) {
    await writeAuditLog({
      orgId: req.user.orgId,
      userId: req.user.id,
      action: "USER_LOGGED_OUT",
      entityType: "User",
      entityId: req.user.id,
    });
  }
  res.json({ success: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: user.orgId } });
  const location = user.locationId ? await prisma.location.findUnique({ where: { id: user.locationId } }) : null;
  res.json({ user: toPublicUser(user), organization, location });
});

const registerOrgSchema = z.object({
  orgName: z.string().min(2),
  orgType: z.string().min(2),
  primaryContactName: z.string().min(2),
  primaryContactEmail: z.string().email(),
  primaryContactPhone: z.string().optional(),
  currency: z.string().min(1).default("USD"),
  timezone: z.string().min(1).default("UTC"),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8, "Password must be at least 8 characters."),
});

/** Public endpoint: creates a brand-new organization + its first ADMIN account. Onboarding wizard continues from here. */
export const registerOrganization = asyncHandler(async (req: Request, res: Response) => {
  const input = registerOrgSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.adminEmail.toLowerCase() } });
  if (existing) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.adminPassword);
  const policy = DEFAULT_ORG_POLICY;

  const { organization, adminUser } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.orgName,
        orgType: input.orgType,
        primaryContactName: input.primaryContactName,
        primaryContactEmail: input.primaryContactEmail,
        primaryContactPhone: input.primaryContactPhone,
        currency: input.currency,
        timezone: input.timezone,
        isDemo: false,
        orgSetupComplete: false,
      },
    });

    await tx.orgSettings.create({
      data: {
        orgId: organization.id,
        serviceLevelZ: policy.serviceLevelZ,
        criticalDaysThreshold: policy.criticalDaysThreshold,
        reviewPeriodDays: policy.reviewPeriodDays,
        overstockCoverageMultiplier: policy.overstockCoverageMultiplier,
        defaultLeadTimeDays: policy.defaultLeadTimeDays,
        minOrderQuantityDefault: policy.minOrderQuantityDefault,
        abcACutoffPct: policy.abcThresholds.aCutoffPct,
        abcBCutoffPct: policy.abcThresholds.bCutoffPct,
        fsnFastMovingDays: policy.fsnFastMovingDays,
        fsnNonMovingDays: policy.fsnNonMovingDays,
        expiryWindowsDays: JSON.stringify(policy.expiryWindowsDays),
      },
    });

    const adminUser = await tx.user.create({
      data: {
        orgId: organization.id,
        email: input.adminEmail.toLowerCase(),
        passwordHash,
        name: input.adminName,
        role: "ADMIN",
      },
    });

    return { organization, adminUser };
  });

  await writeAuditLog({
    orgId: organization.id,
    userId: adminUser.id,
    action: "ORGANIZATION_REGISTERED",
    entityType: "Organization",
    entityId: organization.id,
    newValue: { name: organization.name, orgType: organization.orgType },
  });

  const token = signToken({ userId: adminUser.id, orgId: organization.id, role: "ADMIN", locationId: null });
  res.status(201).json({ token, user: toPublicUser(adminUser), organization });
});
