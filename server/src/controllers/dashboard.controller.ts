import { Request, Response } from "express";
import { z } from "zod";
import { getDashboard } from "../services/analytics.service";
import { asyncHandler } from "../utils/errors";

const filterSchema = z.object({
  locationId: z.string().optional(),
  therapeuticCategory: z.string().optional(),
  riskLevel: z.string().optional(),
  abcCategory: z.string().optional(),
  vedCategory: z.string().optional(),
  supplierId: z.string().optional(),
});

export const getDashboardData = asyncHandler(async (req: Request, res: Response) => {
  const filters = filterSchema.parse(req.query);
  const data = await getDashboard(req.user!.orgId, filters);
  res.json(data);
});
