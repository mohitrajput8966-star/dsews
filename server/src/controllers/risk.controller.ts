import { Request, Response } from "express";
import { z } from "zod";
import type { RiskLevel } from "@dsews/shared";
import { assessOrganizationInventory, assessInventoryItem } from "../services/risk-engine.service";
import { asyncHandler, AppError } from "../utils/errors";

const RISK_LEVELS: RiskLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const listQuerySchema = z.object({
  locationId: z.string().optional(),
  riskLevel: z
    .string()
    .optional()
    .transform((v) => v?.split(",").map((s) => s.trim().toUpperCase()))
    .refine((levels) => !levels || levels.every((l) => RISK_LEVELS.includes(l as RiskLevel)), {
      message: `riskLevel must be a comma-separated list of ${RISK_LEVELS.join(", ")}`,
    }),
});

/** Every inventory position in the caller's org, risk-assessed live from InventoryItem + ConsumptionHistory. */
export const listRiskAssessments = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const { items, summary } = await assessOrganizationInventory(req.user!.orgId, {
    locationId: query.locationId,
    riskLevels: query.riskLevel as RiskLevel[] | undefined,
  });
  res.json({ items, summary });
});

/** Full explanation for one inventory position — current stock, ADC, days remaining, lead time,
 * safety stock, reorder point, projected stock-out date, why it's classified that way, and the
 * recommended action. Always present regardless of level, but this is the payload the assignment
 * requires specifically for HIGH/CRITICAL drugs. */
export const getRiskAssessment = asyncHandler(async (req: Request, res: Response) => {
  const result = await assessInventoryItem(req.params.inventoryItemId, req.user!.orgId);
  if (!result) throw new AppError(404, "Inventory item not found.");
  res.json(result);
});
