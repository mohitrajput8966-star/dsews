// ============================================================================
// DSEWS Stock-out Risk & Forecasting Engine
//
// Every function here is a pure, documented, independently testable formula.
// Nothing is a "black box": calculateRiskAssessment() returns a full factor
// breakdown so the UI can show the user exactly why a drug got its risk level.
// ============================================================================

import {
  ConsumptionRecord,
  OrgPolicy,
  RiskAssessment,
  RiskFactorBreakdown,
  RiskLevel,
  ProcurementRecommendation,
  ForecastMethod,
  ForecastResultSummary,
  ForecastPoint,
  Criticality,
  ABCCategory,
  FSNCategory,
} from "./types";
import { RISK_FACTOR_WEIGHTS, CRITICALITY_SCORE } from "./constants";

// ---------------------------------------------------------------------------
// 1. Consumption statistics
// ---------------------------------------------------------------------------

/** Average Daily Consumption = total consumed / number of days in the analysis period. */
export function averageDailyConsumption(records: ConsumptionRecord[], periodDays: number): number {
  if (periodDays <= 0) return 0;
  const total = records.reduce((sum, r) => sum + r.quantity, 0);
  return total / periodDays;
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Coefficient of variation: stdDev / mean. 0 = perfectly steady demand, >1 = highly volatile. */
export function coefficientOfVariation(records: ConsumptionRecord[]): number {
  const values = records.map((r) => r.quantity);
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  if (mean === 0) return 0;
  return standardDeviation(values) / mean;
}

// ---------------------------------------------------------------------------
// 2. Core inventory formulas
// ---------------------------------------------------------------------------

/** Expected demand consumed while waiting for a replenishment order to arrive. */
export function leadTimeDemand(adc: number, leadTimeDays: number): number {
  return adc * leadTimeDays;
}

/**
 * Safety Stock = Z * stdDev(daily demand) * sqrt(leadTime)
 * Z is the org's configured service-level factor (see SERVICE_LEVEL_Z_TABLE).
 */
export function safetyStock(z: number, dailyDemandStdDev: number, leadTimeDays: number): number {
  return z * dailyDemandStdDev * Math.sqrt(Math.max(leadTimeDays, 0));
}

/** Reorder Point = Lead Time Demand + Safety Stock. */
export function reorderPoint(leadTimeDemandValue: number, safetyStockValue: number): number {
  return leadTimeDemandValue + safetyStockValue;
}

/** Days of Stock Remaining = Current Stock / Average Daily Consumption. Null if ADC is 0 (never depletes). */
export function daysOfStock(currentStock: number, adc: number): number | null {
  if (adc <= 0) return null;
  return currentStock / adc;
}

/** Projected Stock-out Date = today + days of stock remaining (rounded down). */
export function projectedStockoutDate(today: Date, daysRemaining: number | null): string | null {
  if (daysRemaining === null) return null;
  const d = new Date(today);
  d.setDate(d.getDate() + Math.floor(daysRemaining));
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 3. Transparent risk scoring
// ---------------------------------------------------------------------------

export interface RiskAssessmentInput {
  currentStock: number;
  consumptionHistory: ConsumptionRecord[]; // ideally last 90 days
  analysisPeriodDays: number;
  leadTimeDays: number;
  criticality: Criticality;
  reorderLevel: number; // org/drug-configured reorder level (or computed reorderPoint)
  maxStockLevel: number;
  historicalStockoutCount90d: number; // how many times this drug hit zero stock in last 90 days
  policy: OrgPolicy;
  today?: Date;
}

export function calculateRiskAssessment(input: RiskAssessmentInput): RiskAssessment {
  const today = input.today ?? new Date();
  const adc = averageDailyConsumption(input.consumptionHistory, input.analysisPeriodDays);
  const dailyValues = input.consumptionHistory.map((r) => r.quantity);
  const stdDev = standardDeviation(dailyValues);
  const cv = coefficientOfVariation(input.consumptionHistory);

  const ltDemand = leadTimeDemand(adc, input.leadTimeDays);
  const ss = safetyStock(input.policy.serviceLevelZ, stdDev, input.leadTimeDays);
  const rop = reorderPoint(ltDemand, ss);
  const dos = daysOfStock(input.currentStock, adc);
  const stockoutDate = projectedStockoutDate(today, dos);

  // --- Factor 1: Stock-out urgency (coverage vs lead time) ---
  let urgencyRaw: number;
  if (input.currentStock <= 0) {
    urgencyRaw = 1;
  } else if (dos === null) {
    urgencyRaw = 0; // no consumption -> no urgency from this factor
  } else {
    const coverageRatio = dos / Math.max(input.leadTimeDays, 1);
    urgencyRaw = clamp(1 - coverageRatio, 0, 1);
  }
  const urgencyContribution = urgencyRaw * 100 * RISK_FACTOR_WEIGHTS.stockoutUrgency;

  // --- Factor 2: Proximity to / breach of reorder point ---
  const reorderRaw = rop > 0 ? clamp((rop - input.currentStock) / rop, 0, 1) : 0;
  const reorderContribution = reorderRaw * 100 * RISK_FACTOR_WEIGHTS.reorderProximity;

  // --- Factor 3: Consumption volatility ---
  const volatilityRaw = clamp(cv, 0, 1);
  const volatilityContribution = volatilityRaw * 100 * RISK_FACTOR_WEIGHTS.consumptionVolatility;

  // --- Factor 4: Clinical criticality ---
  const criticalityRaw = (CRITICALITY_SCORE[input.criticality] ?? 30) / 100;
  const criticalityContribution = criticalityRaw * 100 * RISK_FACTOR_WEIGHTS.criticality;

  // --- Factor 5: Historical stock-out frequency (normalized against a cap of 5 events/90d) ---
  const historicalRaw = clamp(input.historicalStockoutCount90d / 5, 0, 1);
  const historicalContribution = historicalRaw * 100 * RISK_FACTOR_WEIGHTS.historicalStockoutFrequency;

  const riskScore = round1(
    urgencyContribution + reorderContribution + volatilityContribution + criticalityContribution + historicalContribution
  );

  const factors: RiskFactorBreakdown[] = [
    {
      name: "Stock-out Urgency",
      weightPct: RISK_FACTOR_WEIGHTS.stockoutUrgency * 100,
      rawValue: round1(urgencyRaw * 100),
      contribution: round1(urgencyContribution),
      explanation:
        dos === null
          ? "No recent consumption recorded, so stock is not currently depleting."
          : `Stock covers ${round1(dos)} day(s) against a ${input.leadTimeDays}-day supplier lead time.`,
    },
    {
      name: "Reorder Point Proximity",
      weightPct: RISK_FACTOR_WEIGHTS.reorderProximity * 100,
      rawValue: round1(reorderRaw * 100),
      contribution: round1(reorderContribution),
      explanation: `Current stock ${input.currentStock} vs reorder point ${round1(rop)}.`,
    },
    {
      name: "Consumption Volatility",
      weightPct: RISK_FACTOR_WEIGHTS.consumptionVolatility * 100,
      rawValue: round1(volatilityRaw * 100),
      contribution: round1(volatilityContribution),
      explanation: `Coefficient of variation of daily demand is ${round1(cv * 100)}%.`,
    },
    {
      name: "Drug Criticality",
      weightPct: RISK_FACTOR_WEIGHTS.criticality * 100,
      rawValue: round1(criticalityRaw * 100),
      contribution: round1(criticalityContribution),
      explanation: `Classified as ${input.criticality}.`,
    },
    {
      name: "Historical Stock-out Frequency",
      weightPct: RISK_FACTOR_WEIGHTS.historicalStockoutFrequency * 100,
      rawValue: round1(historicalRaw * 100),
      contribution: round1(historicalContribution),
      explanation: `${input.historicalStockoutCount90d} stock-out event(s) in the last 90 days.`,
    },
  ];

  const isOverstocked =
    input.maxStockLevel > 0 &&
    dos !== null &&
    dos > input.leadTimeDays * input.policy.overstockCoverageMultiplier &&
    input.currentStock > input.maxStockLevel;

  const { riskLevel, triggeredRule } = classifyRiskLevel(input, dos, rop, riskScore);

  return {
    riskLevel,
    riskScore,
    triggeredRule,
    factors,
    averageDailyConsumption: round2(adc),
    daysOfStock: dos === null ? null : round1(dos),
    leadTimeDemand: round2(ltDemand),
    safetyStock: round2(ss),
    reorderPoint: round2(rop),
    projectedStockoutDate: stockoutDate,
    isOverstocked,
  };
}

function classifyRiskLevel(
  input: RiskAssessmentInput,
  dos: number | null,
  rop: number,
  score: number
): { riskLevel: RiskLevel; triggeredRule: string } {
  const { policy, currentStock, leadTimeDays } = input;

  if (currentStock <= 0 || (dos !== null && dos <= policy.criticalDaysThreshold)) {
    return {
      riskLevel: "CRITICAL",
      triggeredRule:
        currentStock <= 0
          ? "Current stock is already at zero."
          : `Projected stock-out in ${round1(dos as number)} day(s), at or below the critical threshold of ${policy.criticalDaysThreshold} days.`,
    };
  }

  if (dos !== null && dos < leadTimeDays) {
    return {
      riskLevel: "HIGH",
      triggeredRule: `Days of stock (${round1(dos)}) is less than the supplier lead time (${leadTimeDays} days) — stock is projected to run out before a reorder can arrive.`,
    };
  }

  if (currentStock <= rop || (dos !== null && dos <= leadTimeDays * 1.5)) {
    return {
      riskLevel: "MEDIUM",
      triggeredRule: `Current stock (${currentStock}) has fallen to or below the reorder point (${round1(rop)}).`,
    };
  }

  return {
    riskLevel: "LOW",
    triggeredRule: "Inventory coverage is adequate relative to lead time and reorder point.",
  };
}

// ---------------------------------------------------------------------------
// 4. Procurement recommendation
// ---------------------------------------------------------------------------

export interface ProcurementInput {
  currentStock: number;
  adc: number;
  leadTimeDays: number;
  reviewPeriodDays: number;
  safetyStockValue: number;
  minOrderQuantity: number;
  maxStockLevel: number;
  unitCost: number;
  riskLevel: RiskLevel;
  today?: Date;
}

/**
 * Order-up-to (target stock) policy:
 * Target Stock = ADC * (Lead Time + Review Period) + Safety Stock
 * Recommended Qty = Target Stock - Current Stock (floored at 0, then floored at min order qty, capped at max stock).
 */
export function calculateProcurementRecommendation(input: ProcurementInput): ProcurementRecommendation {
  const today = input.today ?? new Date();
  const targetStockLevel = input.adc * (input.leadTimeDays + input.reviewPeriodDays) + input.safetyStockValue;
  let qty = Math.max(0, targetStockLevel - input.currentStock);
  if (qty > 0) {
    qty = Math.max(qty, input.minOrderQuantity);
  }
  if (input.maxStockLevel > 0) {
    qty = Math.min(qty, Math.max(0, input.maxStockLevel - input.currentStock));
  }
  qty = Math.ceil(qty);

  const expected = new Date(today);
  expected.setDate(expected.getDate() + input.leadTimeDays);

  return {
    recommendedOrderQuantity: qty,
    targetStockLevel: round2(targetStockLevel),
    estimatedCost: round2(qty * input.unitCost),
    expectedDeliveryDate: expected.toISOString().slice(0, 10),
    priority: input.riskLevel,
  };
}

// ---------------------------------------------------------------------------
// 5. Demand forecasting
// ---------------------------------------------------------------------------

export function movingAverage(values: number[], window: number): number {
  const slice = values.slice(-window);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** More recent days weighted more heavily. Weights auto-generated as 1..N, most recent = N. */
export function weightedMovingAverage(values: number[], window: number): number {
  const slice = values.slice(-window);
  if (slice.length === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  slice.forEach((v, i) => {
    const w = i + 1;
    weightedSum += v * w;
    weightTotal += w;
  });
  return weightedSum / weightTotal;
}

/** Simple exponential smoothing: S_t = alpha * x_t + (1 - alpha) * S_(t-1). Returns the final smoothed value. */
export function exponentialSmoothing(values: number[], alpha = 0.3): number {
  if (values.length === 0) return 0;
  let s = values[0];
  for (let i = 1; i < values.length; i++) {
    s = alpha * values[i] + (1 - alpha) * s;
  }
  return s;
}

export function buildForecastSummary(
  dailyRecords: ConsumptionRecord[],
  method: ForecastMethod,
  forecastHorizonDays = 14
): ForecastResultSummary {
  const sorted = [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((r) => r.quantity);

  const avg7 = movingAverage(values, 7);
  const avg30 = movingAverage(values, 30);
  const avg90 = movingAverage(values, 90);
  const trendPctChange = avg90 > 0 ? round1(((avg30 - avg90) / avg90) * 100) : 0;

  let forecastedDailyDemand: number;
  switch (method) {
    case "MOVING_AVERAGE":
      forecastedDailyDemand = avg30 || avg7;
      break;
    case "WEIGHTED_MOVING_AVERAGE":
      forecastedDailyDemand = weightedMovingAverage(values, 30) || weightedMovingAverage(values, 7);
      break;
    case "EXPONENTIAL_SMOOTHING":
    default:
      forecastedDailyDemand = exponentialSmoothing(values, 0.3);
      break;
  }
  forecastedDailyDemand = round2(forecastedDailyDemand);

  const points: ForecastPoint[] = sorted.map((r) => ({
    date: r.date,
    historicalConsumption: r.quantity,
    forecastConsumption: null,
  }));

  const lastDate = sorted.length > 0 ? new Date(sorted[sorted.length - 1].date) : new Date();
  for (let i = 1; i <= forecastHorizonDays; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i);
    points.push({
      date: d.toISOString().slice(0, 10),
      historicalConsumption: null,
      forecastConsumption: forecastedDailyDemand,
    });
  }

  return {
    method,
    avg7Day: round2(avg7),
    avg30Day: round2(avg30),
    avg90Day: round2(avg90),
    trendPctChange,
    forecastedDailyDemand,
    points,
  };
}

// ---------------------------------------------------------------------------
// 6. ABC / VED / FSN classification
// ---------------------------------------------------------------------------

export interface ABCInput {
  id: string;
  annualValue: number;
}

/** Pareto-based ABC classification by cumulative inventory value share. */
export function classifyABC(items: ABCInput[], aCutoffPct = 70, bCutoffPct = 90): Record<string, ABCCategory> {
  const totalValue = items.reduce((s, i) => s + i.annualValue, 0);
  const sorted = [...items].sort((a, b) => b.annualValue - a.annualValue);
  const result: Record<string, ABCCategory> = {};
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.annualValue;
    const cumulativePct = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
    result[item.id] = cumulativePct <= aCutoffPct ? "A" : cumulativePct <= bCutoffPct ? "B" : "C";
  }
  return result;
}

export interface FSNInput {
  id: string;
  lastConsumptionDate: string | null;
  consumptionDaysCount: number; // number of distinct days with consumption > 0 in the analysis window
  analysisPeriodDays: number;
}

/** Fast/Slow/Non-moving classification based on recency + frequency of consumption. */
export function classifyFSN(item: FSNInput, fastMovingDays: number, nonMovingDays: number, today = new Date()): FSNCategory {
  if (!item.lastConsumptionDate) return "N";
  const daysSinceLastConsumption = Math.floor(
    (today.getTime() - new Date(item.lastConsumptionDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceLastConsumption > nonMovingDays) return "N";
  const frequencyRatio = item.consumptionDaysCount / Math.max(item.analysisPeriodDays, 1);
  if (daysSinceLastConsumption <= fastMovingDays && frequencyRatio >= 0.5) return "F";
  return "S";
}

// ---------------------------------------------------------------------------
// 7. Expiry helpers
// ---------------------------------------------------------------------------

export function daysUntilExpiry(expiryDate: string, today = new Date()): number {
  const exp = new Date(expiryDate);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function expiryBucket(daysRemaining: number, windows: number[] = [30, 60, 90]): string {
  if (daysRemaining < 0) return "EXPIRED";
  const sorted = [...windows].sort((a, b) => a - b);
  for (const w of sorted) {
    if (daysRemaining <= w) return `WITHIN_${w}_DAYS`;
  }
  return "BEYOND";
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
