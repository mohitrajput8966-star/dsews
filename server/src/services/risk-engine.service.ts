// ============================================================================
// DSEWS Risk Engine SERVICE — the bridge between the pure calculation
// functions in packages/shared/src/calculations.ts and real database data.
//
// The formulas themselves (ADC, days-of-stock, lead-time demand, safety
// stock, reorder point, projected stock-out date, the risk score/level, and
// the procurement recommendation) are NOT re-implemented here — they live in
// @dsews/shared and are unit-tested there. This file's only job is:
//   1. pull the right rows out of Prisma for one drug at one location,
//   2. hand them to the shared engine in the exact shape it expects,
//   3. turn the result into the plain-English explanation the assignment
//      requires for every HIGH/CRITICAL drug.
// Nothing here is hardcoded: every number comes from InventoryItem,
// ConsumptionHistory, Drug, and OrgSettings rows for the caller's own org.
// ============================================================================

import {
  calculateRiskAssessment,
  calculateProcurementRecommendation,
  type ConsumptionRecord,
  type OrgPolicy,
  type RiskAssessment,
  type ProcurementRecommendation,
  type RiskLevel,
  type Criticality,
} from "@dsews/shared";
import { prisma } from "../lib/prisma";

/** How many trailing days of consumption history define "current" ADC. Must match
 * whatever window analysisPeriodDays is set to below — see server/prisma/seed.ts
 * for why a mismatched (records, period) pair silently inflates ADC. */
export const ADC_WINDOW_DAYS = 30;
/** How far back to look for past CRITICAL alerts when scoring historical stock-out frequency. */
const STOCKOUT_LOOKBACK_DAYS = 90;

export interface InventoryRiskResult {
  inventoryItemId: string;
  drugId: string;
  drugCode: string;
  genericName: string;
  brandName: string | null;
  strength: string;
  therapeuticCategory: string;
  criticality: string;
  locationId: string;
  locationName: string;
  supplierName: string | null;
  currentStock: number;
  leadTimeDays: number;
  reorderLevelConfigured: number;
  maxStockLevel: number;
  unitCost: number;
  assessment: RiskAssessment;
  procurement: ProcurementRecommendation;
  /** Human-readable "why" — always populated, most useful for HIGH/CRITICAL drugs. */
  reasonSummary: string;
  recommendedAction: string;
}

export async function getOrgPolicy(orgId: string): Promise<OrgPolicy> {
  const settings = await prisma.orgSettings.findUnique({ where: { orgId } });
  if (!settings) {
    throw new Error(`Organization ${orgId} has no OrgSettings row — cannot run the risk engine without a policy.`);
  }
  return {
    serviceLevelZ: settings.serviceLevelZ,
    criticalDaysThreshold: settings.criticalDaysThreshold,
    reviewPeriodDays: settings.reviewPeriodDays,
    overstockCoverageMultiplier: settings.overstockCoverageMultiplier,
    defaultLeadTimeDays: settings.defaultLeadTimeDays,
    minOrderQuantityDefault: settings.minOrderQuantityDefault,
    abcThresholds: { aCutoffPct: settings.abcACutoffPct, bCutoffPct: settings.abcBCutoffPct },
    fsnFastMovingDays: settings.fsnFastMovingDays,
    fsnNonMovingDays: settings.fsnNonMovingDays,
    expiryWindowsDays: JSON.parse(settings.expiryWindowsDays),
  };
}

async function getRecentConsumption(drugId: string, locationId: string, windowDays: number): Promise<ConsumptionRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const rows = await prisma.consumptionHistory.findMany({
    where: { drugId, locationId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), quantity: r.quantityConsumed }));
}

/** Counts real past CRITICAL alerts for this drug/location — 0 on a fresh system with no alert history yet,
 * and genuinely non-zero once the alert engine (a later phase) has been running against real operations. */
async function getHistoricalStockoutCount(orgId: string, drugId: string, locationId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - STOCKOUT_LOOKBACK_DAYS);
  return prisma.alert.count({
    where: { orgId, drugId, locationId, type: "CRITICAL", createdAt: { gte: since } },
  });
}

function buildExplanation(
  drugLabel: string,
  assessment: RiskAssessment,
  procurement: ProcurementRecommendation,
  supplierName: string | null
): { reasonSummary: string; recommendedAction: string } {
  const daysText =
    assessment.daysOfStock === null
      ? "no consumption recorded in the analysis window, so stock is not currently depleting"
      : `${assessment.daysOfStock} day(s) of stock remaining${
          assessment.projectedStockoutDate ? ` (projected stock-out: ${assessment.projectedStockoutDate})` : ""
        }`;

  const reasonSummary = `${assessment.riskLevel}: ${drugLabel} has ${daysText}. ${assessment.triggeredRule}`;

  let recommendedAction: string;
  if (assessment.riskLevel === "CRITICAL" || assessment.riskLevel === "HIGH") {
    recommendedAction =
      procurement.recommendedOrderQuantity > 0
        ? `Initiate procurement of ${procurement.recommendedOrderQuantity} unit(s) from ${supplierName ?? "the assigned supplier"} — estimated cost ${procurement.estimatedCost.toFixed(
            2
          )}, expected delivery ${procurement.expectedDeliveryDate}.`
        : "Current stock already meets the target level for this lead time — verify the supplier lead time and consumption trend before ordering.";
  } else if (assessment.riskLevel === "MEDIUM") {
    recommendedAction = `Stock has reached the reorder point — schedule a routine reorder of ${procurement.recommendedOrderQuantity} unit(s) within the normal review cycle.`;
  } else if (assessment.isOverstocked) {
    recommendedAction = "Inventory exceeds the configured maximum coverage — consider an internal stock transfer or pausing the next scheduled order.";
  } else {
    recommendedAction = "No action required — inventory coverage is adequate.";
  }

  return { reasonSummary, recommendedAction };
}

/** Runs the full risk + procurement assessment for ONE inventory position, using live DB data only. */
export async function assessInventoryItem(inventoryItemId: string, orgId: string): Promise<InventoryRiskResult | null> {
  const item = await prisma.inventoryItem.findFirst({
    where: { id: inventoryItemId, orgId },
    include: { drug: true, location: true, supplier: true },
  });
  if (!item) return null;

  const policy = await getOrgPolicy(orgId);
  const history = await getRecentConsumption(item.drugId, item.locationId, ADC_WINDOW_DAYS);
  const historicalStockoutCount90d = await getHistoricalStockoutCount(orgId, item.drugId, item.locationId);

  const assessment = calculateRiskAssessment({
    currentStock: item.currentStock,
    consumptionHistory: history,
    analysisPeriodDays: ADC_WINDOW_DAYS,
    leadTimeDays: item.leadTimeDays,
    criticality: item.drug.criticality as Criticality,
    reorderLevel: item.reorderLevel,
    maxStockLevel: item.maxStockLevel,
    historicalStockoutCount90d,
    policy,
  });

  const procurement = calculateProcurementRecommendation({
    currentStock: item.currentStock,
    adc: assessment.averageDailyConsumption,
    leadTimeDays: item.leadTimeDays,
    reviewPeriodDays: policy.reviewPeriodDays,
    safetyStockValue: assessment.safetyStock,
    minOrderQuantity: policy.minOrderQuantityDefault,
    maxStockLevel: item.maxStockLevel,
    unitCost: item.drug.unitCost,
    riskLevel: assessment.riskLevel,
  });

  const drugLabel = `${item.drug.genericName} ${item.drug.strength}${item.drug.brandName ? ` (${item.drug.brandName})` : ""}`;
  const { reasonSummary, recommendedAction } = buildExplanation(drugLabel, assessment, procurement, item.supplier?.name ?? null);

  return {
    inventoryItemId: item.id,
    drugId: item.drugId,
    drugCode: item.drug.drugCode,
    genericName: item.drug.genericName,
    brandName: item.drug.brandName,
    strength: item.drug.strength,
    therapeuticCategory: item.drug.therapeuticCategory,
    criticality: item.drug.criticality,
    locationId: item.locationId,
    locationName: item.location.name,
    supplierName: item.supplier?.name ?? null,
    currentStock: item.currentStock,
    leadTimeDays: item.leadTimeDays,
    reorderLevelConfigured: item.reorderLevel,
    maxStockLevel: item.maxStockLevel,
    unitCost: item.drug.unitCost,
    assessment,
    procurement,
    reasonSummary,
    recommendedAction,
  };
}

export interface RiskSummary {
  totalItems: number;
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  overstocked: number;
}

/** Runs the assessment for every inventory position in the org (optionally filtered by location). */
export async function assessOrganizationInventory(
  orgId: string,
  filters: { locationId?: string; riskLevels?: RiskLevel[] } = {}
): Promise<{ items: InventoryRiskResult[]; summary: RiskSummary }> {
  const policy = await getOrgPolicy(orgId);

  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { orgId, ...(filters.locationId ? { locationId: filters.locationId } : {}) },
    include: { drug: true, location: true, supplier: true },
  });

  const results: InventoryRiskResult[] = [];
  for (const item of inventoryItems) {
    const history = await getRecentConsumption(item.drugId, item.locationId, ADC_WINDOW_DAYS);
    const historicalStockoutCount90d = await getHistoricalStockoutCount(orgId, item.drugId, item.locationId);

    const assessment = calculateRiskAssessment({
      currentStock: item.currentStock,
      consumptionHistory: history,
      analysisPeriodDays: ADC_WINDOW_DAYS,
      leadTimeDays: item.leadTimeDays,
      criticality: item.drug.criticality as Criticality,
      reorderLevel: item.reorderLevel,
      maxStockLevel: item.maxStockLevel,
      historicalStockoutCount90d,
      policy,
    });

    const procurement = calculateProcurementRecommendation({
      currentStock: item.currentStock,
      adc: assessment.averageDailyConsumption,
      leadTimeDays: item.leadTimeDays,
      reviewPeriodDays: policy.reviewPeriodDays,
      safetyStockValue: assessment.safetyStock,
      minOrderQuantity: policy.minOrderQuantityDefault,
      maxStockLevel: item.maxStockLevel,
      unitCost: item.drug.unitCost,
      riskLevel: assessment.riskLevel,
    });

    const drugLabel = `${item.drug.genericName} ${item.drug.strength}${item.drug.brandName ? ` (${item.drug.brandName})` : ""}`;
    const { reasonSummary, recommendedAction } = buildExplanation(drugLabel, assessment, procurement, item.supplier?.name ?? null);

    results.push({
      inventoryItemId: item.id,
      drugId: item.drugId,
      drugCode: item.drug.drugCode,
      genericName: item.drug.genericName,
      brandName: item.drug.brandName,
      strength: item.drug.strength,
      therapeuticCategory: item.drug.therapeuticCategory,
      criticality: item.drug.criticality,
      locationId: item.locationId,
      locationName: item.location.name,
      supplierName: item.supplier?.name ?? null,
      currentStock: item.currentStock,
      leadTimeDays: item.leadTimeDays,
      reorderLevelConfigured: item.reorderLevel,
      maxStockLevel: item.maxStockLevel,
      unitCost: item.drug.unitCost,
      assessment,
      procurement,
      reasonSummary,
      recommendedAction,
    });
  }

  const filtered = filters.riskLevels?.length ? results.filter((r) => filters.riskLevels!.includes(r.assessment.riskLevel)) : results;

  const summary: RiskSummary = {
    totalItems: results.length,
    CRITICAL: results.filter((r) => r.assessment.riskLevel === "CRITICAL").length,
    HIGH: results.filter((r) => r.assessment.riskLevel === "HIGH").length,
    MEDIUM: results.filter((r) => r.assessment.riskLevel === "MEDIUM").length,
    LOW: results.filter((r) => r.assessment.riskLevel === "LOW").length,
    overstocked: results.filter((r) => r.assessment.isOverstocked).length,
  };

  // Most actionable first: CRITICAL > HIGH > MEDIUM > LOW, ties broken by fewest days of stock remaining.
  const levelOrder: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  filtered.sort((a, b) => {
    const levelDiff = levelOrder[a.assessment.riskLevel] - levelOrder[b.assessment.riskLevel];
    if (levelDiff !== 0) return levelDiff;
    const aDays = a.assessment.daysOfStock ?? Infinity;
    const bDays = b.assessment.daysOfStock ?? Infinity;
    return aDays - bDays;
  });

  return { items: filtered, summary };
}
