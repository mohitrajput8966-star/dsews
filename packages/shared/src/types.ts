// Shared domain types used by both the API server and the web client.
// Keeping these in one place guarantees the risk engine's inputs/outputs
// are identical wherever they're computed (server nightly job, or the
// browser-side "What-If Simulator").

export type UserRole =
  | "ADMIN"
  | "SUPPLY_CHAIN_MANAGER"
  | "PHARMACY_MANAGER"
  | "WAREHOUSE_MANAGER"
  | "PROCUREMENT_OFFICER"
  | "HOSPITAL_ADMIN"
  | "EXECUTIVE";

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type StockStatus = RiskLevel | "OVERSTOCK" | "OUT_OF_STOCK";

export type ABCCategory = "A" | "B" | "C";
export type VEDCategory = "V" | "E" | "D";
export type FSNCategory = "F" | "S" | "N";
export type Criticality = "VITAL" | "ESSENTIAL" | "DESIRABLE";

export type ForecastMethod = "MOVING_AVERAGE" | "WEIGHTED_MOVING_AVERAGE" | "EXPONENTIAL_SMOOTHING";

export type PurchaseRequestStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ORDERED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "CANCELLED"
  | "REJECTED";

export type StockMovementType = "RECEIPT" | "ISSUE" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT" | "EXPIRY_WRITE_OFF";

export type AlertType = "CRITICAL" | "HIGH_RISK" | "REORDER" | "EXPIRY" | "EXPIRED" | "OVERSTOCK" | "SUPPLIER_DELAY";

/** A single day's consumption record, the raw input to every downstream calculation. */
export interface ConsumptionRecord {
  date: string; // ISO date
  quantity: number;
}

/** Org-configurable policy knobs — never hardcoded, per assignment section 6/9. */
export interface OrgPolicy {
  serviceLevelZ: number; // e.g. 1.65 = 95%, 1.96 = 97.5%, 2.33 = 99%
  criticalDaysThreshold: number; // days of stock <= this => CRITICAL
  reviewPeriodDays: number; // for target-stock / order-up-to policy
  overstockCoverageMultiplier: number; // days-of-stock > leadTime * this => OVERSTOCK
  defaultLeadTimeDays: number;
  minOrderQuantityDefault: number;
  abcThresholds: { aCutoffPct: number; bCutoffPct: number }; // cumulative value %
  fsnFastMovingDays: number; // consumed within N days => candidate Fast
  fsnNonMovingDays: number; // no consumption within N days => Non-moving
  expiryWindowsDays: number[]; // e.g. [30, 60, 90]
}

export interface RiskFactorBreakdown {
  name: string;
  weightPct: number;
  rawValue: number;
  contribution: number; // 0-100 scaled contribution to the score
  explanation: string;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100, higher = more urgent
  triggeredRule: string; // human-readable reason the level was assigned
  factors: RiskFactorBreakdown[];
  averageDailyConsumption: number;
  daysOfStock: number | null; // null when ADC is 0 (no consumption to divide by)
  leadTimeDemand: number;
  safetyStock: number;
  reorderPoint: number;
  projectedStockoutDate: string | null; // ISO date, null if not depleting
  isOverstocked: boolean;
}

export interface ProcurementRecommendation {
  recommendedOrderQuantity: number;
  targetStockLevel: number;
  estimatedCost: number;
  expectedDeliveryDate: string; // ISO date
  priority: RiskLevel;
}

export interface ForecastPoint {
  date: string;
  historicalConsumption: number | null;
  forecastConsumption: number | null;
}

export interface ForecastResultSummary {
  method: ForecastMethod;
  avg7Day: number;
  avg30Day: number;
  avg90Day: number;
  trendPctChange: number; // (avg30 - avg90)/avg90 * 100
  forecastedDailyDemand: number;
  points: ForecastPoint[];
}
