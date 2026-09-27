import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../utils/errors";
import { writeAuditLog } from "../services/audit.service";

/** Always scoped to req.user.orgId — never trusts a client-supplied orgId. This is the multi-tenant isolation boundary. */
export const listLocations = asyncHandler(async (req: Request, res: Response) => {
  const locations = await prisma.location.findMany({
    where: { orgId: req.user!.orgId },
    orderBy: { name: "asc" },
  });
  res.json({ locations });
});

const createLocationSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const createLocation = asyncHandler(async (req: Request, res: Response) => {
  const input = createLocationSchema.parse(req.body);
  const location = await prisma.location.create({
    data: { ...input, orgId: req.user!.orgId },
  });
  await writeAuditLog({
    orgId: req.user!.orgId,
    userId: req.user!.id,
    action: "LOCATION_CREATED",
    entityType: "Location",
    entityId: location.id,
    newValue: location,
  });
  res.status(201).json({ location });
});

const updateLocationSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.string().min(2).optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const input = updateLocationSchema.parse(req.body);
  const existing = await prisma.location.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId } });
  if (!existing) throw new AppError(404, "Location not found.");

  const location = await prisma.location.update({ where: { id: existing.id }, data: input });
  await writeAuditLog({
    orgId: req.user!.orgId,
    userId: req.user!.id,
    action: input.isActive === false ? "LOCATION_DEACTIVATED" : input.isActive === true ? "LOCATION_ACTIVATED" : "LOCATION_UPDATED",
    entityType: "Location",
    entityId: location.id,
    oldValue: existing,
    newValue: location,
  });
  res.json({ location });
});
