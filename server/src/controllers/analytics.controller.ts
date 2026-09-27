import { Request, Response } from "express";
import { getAbcVedMatrix, getFsnReport, getExpiryReport, getSupplierPerformance } from "../services/analytics.service";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/errors";

/** Name/id only, for filter dropdowns — any authenticated user, not gated behind procurement:suppliers. */
export const supplierList = asyncHandler(async (req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({ where: { orgId: req.user!.orgId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  res.json({ suppliers });
});

export const abcVed = asyncHandler(async (req: Request, res: Response) => {
  const matrix = await getAbcVedMatrix(req.user!.orgId);
  res.json({ matrix });
});

export const fsn = asyncHandler(async (req: Request, res: Response) => {
  const rows = await getFsnReport(req.user!.orgId);
  res.json({ rows });
});

export const expiry = asyncHandler(async (req: Request, res: Response) => {
  const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
  const rows = await getExpiryReport(req.user!.orgId, locationId);
  res.json({ rows });
});

export const suppliers = asyncHandler(async (req: Request, res: Response) => {
  const rows = await getSupplierPerformance(req.user!.orgId);
  res.json({ rows });
});
