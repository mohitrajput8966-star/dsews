import { Request, Response } from "express";
import { z } from "zod";
import { regenerateAlerts, listAlerts, getUnreadCount, markAlertRead, markAllRead } from "../services/alert.service";
import { asyncHandler, AppError } from "../utils/errors";

const filterSchema = z.object({
  type: z.string().optional(),
  riskLevel: z.string().optional(),
  locationId: z.string().optional(),
  isRead: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  isResolved: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

/** Always re-syncs alerts with current state before listing, so the list can never go stale. */
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const filters = filterSchema.parse(req.query);
  await regenerateAlerts(req.user!.orgId);
  const alerts = await listAlerts(req.user!.orgId, filters);
  res.json({ alerts });
});

export const regenerate = asyncHandler(async (req: Request, res: Response) => {
  const result = await regenerateAlerts(req.user!.orgId);
  res.json(result);
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await getUnreadCount(req.user!.orgId);
  res.json({ count });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const alert = await markAlertRead(req.user!.orgId, req.params.id);
  if (!alert) throw new AppError(404, "Alert not found.");
  res.json({ alert });
});

export const markAll = asyncHandler(async (req: Request, res: Response) => {
  const count = await markAllRead(req.user!.orgId);
  res.json({ updated: count });
});
