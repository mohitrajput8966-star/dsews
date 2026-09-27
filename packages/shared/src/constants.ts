import { OrgPolicy } from "./types";

/** Sensible defaults a new organization starts with; fully editable in Org Settings. */
export const DEFAULT_ORG_POLICY: OrgPolicy = {
  serviceLevelZ: 1.65, // ~95% service level
  criticalDaysThreshold: 4,
  reviewPeriodDays: 14,
  overstockCoverageMultiplier: 3,
  defaultLeadTimeDays: 7,
  minOrderQuantityDefault: 10,
  abcThresholds: { aCutoffPct: 70, bCutoffPct: 90 },
  fsnFastMovingDays: 30,
  fsnNonMovingDays: 90,
  expiryWindowsDays: [30, 60, 90],
};

/** Standard normal Z-values for common service levels, shown in the Org Settings UI. */
export const SERVICE_LEVEL_Z_TABLE: { serviceLevelPct: number; z: number }[] = [
  { serviceLevelPct: 90, z: 1.28 },
  { serviceLevelPct: 95, z: 1.65 },
  { serviceLevelPct: 97.5, z: 1.96 },
  { serviceLevelPct: 99, z: 2.33 },
  { serviceLevelPct: 99.9, z: 3.09 },
];

export const RISK_FACTOR_WEIGHTS = {
  stockoutUrgency: 0.35,
  reorderProximity: 0.2,
  consumptionVolatility: 0.15,
  criticality: 0.2,
  historicalStockoutFrequency: 0.1,
};

export const CRITICALITY_SCORE: Record<string, number> = {
  VITAL: 100,
  ESSENTIAL: 60,
  DESIRABLE: 30,
};
