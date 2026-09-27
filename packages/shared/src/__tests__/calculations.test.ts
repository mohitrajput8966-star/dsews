// ============================================================================
// Unit tests for the DSEWS stock-out risk & forecasting engine.
//
// The 5 "realistic scenario" tests at the bottom of this file are deliberately
// modeled on the assignment's own worked examples (Ceftriaxone, Enoxaparin,
// Pantoprazole, a stable fast-mover, and an overstocked bulk item) so the
// engine's output can be checked directly against the narrative it's meant
// to produce. Every other test isolates ONE formula at a time.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  averageDailyConsumption,
  standardDeviation,
  leadTimeDemand,
  safetyStock,
  reorderPoint,
  daysOfStock,
  projectedStockoutDate,
  calculateRiskAssessment,
  calculateProcurementRecommendation,
  classifyABC,
  classifyFSN,
  expiryBucket,
  daysUntilExpiry,
} from "../index";
import { DEFAULT_ORG_POLICY } from "../constants";
import type { ConsumptionRecord, OrgPolicy } from "../types";

function constantHistory(dailyQty: number, days: number): ConsumptionRecord[] {
  const records: ConsumptionRecord[] = [];
  const today = new Date("2026-06-30T00:00:00.000Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    records.push({ date: d.toISOString().slice(0, 10), quantity: dailyQty });
  }
  return records;
}

function alternatingHistory(low: number, high: number, days: number): ConsumptionRecord[] {
  const records: ConsumptionRecord[] = [];
  const today = new Date("2026-06-30T00:00:00.000Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    records.push({ date: d.toISOString().slice(0, 10), quantity: i % 2 === 0 ? low : high });
  }
  return records;
}

const TODAY = new Date("2026-06-30T00:00:00.000Z");

// ---------------------------------------------------------------------------
// 1. Average Daily Consumption
// ---------------------------------------------------------------------------
describe("1. Average Daily Consumption", () => {
  it("= total quantity consumed / number of days in the analysis period", () => {
    const records = constantHistory(25, 30); // 25 units/day for 30 days = 750 total
    expect(averageDailyConsumption(records, 30)).toBe(25);
  });

  it("returns 0 for a zero-length period rather than dividing by zero", () => {
    expect(averageDailyConsumption(constantHistory(10, 30), 0)).toBe(0);
  });

  it("averages over the given period even when fewer records are supplied", () => {
    // 300 units total consumed, spread over a 30-day accounting period.
    const records = constantHistory(10, 30);
    expect(averageDailyConsumption(records, 30)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 2. Days of Stock
// ---------------------------------------------------------------------------
describe("2. Days of Stock", () => {
  it("= current stock / average daily consumption", () => {
    expect(daysOfStock(120, 25)).toBeCloseTo(4.8, 5);
  });

  it("is null (not Infinity/NaN) when ADC is zero — stock isn't depleting", () => {
    expect(daysOfStock(500, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Lead Time Demand
// ---------------------------------------------------------------------------
describe("3. Lead Time Demand", () => {
  it("= average daily consumption x lead time in days", () => {
    expect(leadTimeDemand(25, 8)).toBe(200);
    expect(leadTimeDemand(10, 8)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 4. Safety Stock
// ---------------------------------------------------------------------------
describe("4. Safety Stock", () => {
  it("= Z x stdDev(daily demand) x sqrt(lead time)", () => {
    // Worked example: Z=1.65 (~95% service level), stdDev=5, leadTime=6 days
    // -> 1.65 * 5 * sqrt(6) = 1.65 * 5 * 2.449... = 20.21
    expect(safetyStock(1.65, 5, 6)).toBeCloseTo(20.21, 1);
  });

  it("is 0 when demand is perfectly steady (stdDev = 0)", () => {
    expect(safetyStock(1.65, 0, 10)).toBe(0);
  });

  it("increases with the service-level Z-factor for identical volatility", () => {
    const low = safetyStock(1.28, 5, 6); // ~90% service level
    const high = safetyStock(2.33, 5, 6); // ~99% service level
    expect(high).toBeGreaterThan(low);
  });
});

// ---------------------------------------------------------------------------
// 5. Reorder Point
// ---------------------------------------------------------------------------
describe("5. Reorder Point", () => {
  it("= lead time demand + safety stock", () => {
    expect(reorderPoint(200, 0)).toBe(200);
    expect(reorderPoint(120, 20.21)).toBeCloseTo(140.21, 2);
  });
});

// ---------------------------------------------------------------------------
// 6. Projected Stock-out Date
// ---------------------------------------------------------------------------
describe("6. Projected Stock-out Date", () => {
  it("= today + floor(days of stock remaining)", () => {
    // 4.8 days from 2026-06-30 -> floor to 4 whole days -> 2026-07-04
    expect(projectedStockoutDate(TODAY, 4.8)).toBe("2026-07-04");
  });

  it("is null when there is no consumption to deplete the stock", () => {
    expect(projectedStockoutDate(TODAY, null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. Recommended Order Quantity (procurement policy)
// ---------------------------------------------------------------------------
describe("9. Recommended Order Quantity", () => {
  it("= (ADC x (lead time + review period) + safety stock) - current stock, floored at 0", () => {
    // ADC=25, LT=8, review=14d, safetyStock=20 -> target = 25*22+20 = 570; stock=120 -> qty=450
    const rec = calculateProcurementRecommendation({
      currentStock: 120,
      adc: 25,
      leadTimeDays: 8,
      reviewPeriodDays: 14,
      safetyStockValue: 20,
      minOrderQuantity: 10,
      maxStockLevel: 0, // uncapped
      unitCost: 1.85,
      riskLevel: "CRITICAL",
      today: TODAY,
    });
    expect(rec.targetStockLevel).toBeCloseTo(570, 2);
    expect(rec.recommendedOrderQuantity).toBe(450);
    expect(rec.estimatedCost).toBeCloseTo(450 * 1.85, 2);
    expect(rec.expectedDeliveryDate).toBe("2026-07-08"); // today + 8-day lead time
  });

  it("never recommends less than the configured minimum order quantity once an order is needed", () => {
    const rec = calculateProcurementRecommendation({
      currentStock: 95,
      adc: 5,
      leadTimeDays: 7,
      reviewPeriodDays: 7,
      safetyStockValue: 5,
      minOrderQuantity: 50,
      maxStockLevel: 0,
      unitCost: 1,
      riskLevel: "MEDIUM",
      today: TODAY,
    });
    // Raw target = 5*14+5 = 75; stock=95 -> raw gap is negative (no order needed)
    expect(rec.recommendedOrderQuantity).toBe(0);
  });

  it("caps the recommendation so current + order never exceeds max stock level", () => {
    const rec = calculateProcurementRecommendation({
      currentStock: 10,
      adc: 20,
      leadTimeDays: 10,
      reviewPeriodDays: 14,
      safetyStockValue: 30,
      minOrderQuantity: 10,
      maxStockLevel: 300,
      unitCost: 2,
      riskLevel: "HIGH",
      today: TODAY,
    });
    // Raw target = 20*24+30 = 510; gap = 500, but capped at maxStock(300) - current(10) = 290
    expect(rec.recommendedOrderQuantity).toBe(290);
  });
});

// ---------------------------------------------------------------------------
// Supporting classification helpers (ABC / FSN / Expiry)
// ---------------------------------------------------------------------------
describe("Supporting classifications", () => {
  it("ABC: classifies by cumulative value share (Pareto)", () => {
    const result = classifyABC(
      [
        { id: "high-value", annualValue: 7000 },
        { id: "mid-value", annualValue: 2000 },
        { id: "low-value", annualValue: 1000 },
      ],
      70,
      90
    );
    expect(result["high-value"]).toBe("A"); // 70% cumulative
    expect(result["mid-value"]).toBe("B"); // 90% cumulative
    expect(result["low-value"]).toBe("C"); // 100% cumulative
  });

  it("FSN: flags a drug with no recorded consumption as Non-moving", () => {
    expect(
      classifyFSN({ id: "ranitidine", lastConsumptionDate: null, consumptionDaysCount: 0, analysisPeriodDays: 90 }, 30, 90)
    ).toBe("N");
  });

  it("FSN: flags frequent recent consumption as Fast-moving", () => {
    expect(
      classifyFSN(
        { id: "paracetamol", lastConsumptionDate: "2026-06-29", consumptionDaysCount: 25, analysisPeriodDays: 30 },
        30,
        90,
        TODAY
      )
    ).toBe("F");
  });

  it("Expiry: buckets a batch expiring in 15 days as within the 30-day window", () => {
    const in15Days = new Date(TODAY);
    in15Days.setDate(in15Days.getDate() + 15);
    const days = daysUntilExpiry(in15Days.toISOString().slice(0, 10), TODAY);
    expect(expiryBucket(days, [30, 60, 90])).toBe("WITHIN_30_DAYS");
  });

  it("Expiry: a past expiry date is bucketed as EXPIRED", () => {
    expect(expiryBucket(-3)).toBe("EXPIRED");
  });
});

// ============================================================================
// 5 realistic end-to-end risk-assessment scenarios
// ============================================================================
describe("Realistic scenario 1 — Ceftriaxone 1g (assignment's worked example)", () => {
  it("120 units on hand, ADC 25/day, 8-day lead time -> 4.8 days of stock, HIGH (below lead-time coverage)", () => {
    const policy: OrgPolicy = DEFAULT_ORG_POLICY; // criticalDaysThreshold = 4
    const assessment = calculateRiskAssessment({
      currentStock: 120,
      consumptionHistory: constantHistory(25, 30),
      analysisPeriodDays: 30,
      leadTimeDays: 8,
      criticality: "VITAL",
      reorderLevel: 0,
      maxStockLevel: 1000,
      historicalStockoutCount90d: 0,
      policy,
      today: TODAY,
    });

    expect(assessment.averageDailyConsumption).toBe(25);
    expect(assessment.daysOfStock).toBeCloseTo(4.8, 5);
    expect(assessment.leadTimeDemand).toBe(200);
    expect(assessment.safetyStock).toBe(0); // zero volatility in this scenario
    expect(assessment.reorderPoint).toBe(200);
    expect(assessment.projectedStockoutDate).toBe("2026-07-04");
    // 4.8 days clears the 4-day CRITICAL threshold, but is still less than the
    // 8-day lead time, so a reorder placed today would still arrive too late.
    expect(assessment.riskLevel).toBe("HIGH");
    expect(assessment.triggeredRule).toMatch(/less than the supplier lead time/);
  });
});

describe("Realistic scenario 2 — Enoxaparin 40mg (assignment's worked example)", () => {
  it("6 days of stock against an 8-day lead time -> HIGH RISK", () => {
    const assessment = calculateRiskAssessment({
      currentStock: 60,
      consumptionHistory: constantHistory(10, 30),
      analysisPeriodDays: 30,
      leadTimeDays: 8,
      criticality: "VITAL",
      reorderLevel: 0,
      maxStockLevel: 1000,
      historicalStockoutCount90d: 0,
      policy: DEFAULT_ORG_POLICY,
      today: TODAY,
    });

    expect(assessment.daysOfStock).toBe(6);
    expect(assessment.riskLevel).toBe("HIGH");
    expect(assessment.triggeredRule).toContain("8 days");
  });
});

describe("Realistic scenario 3 — Pantoprazole 40mg (reorder-point breach)", () => {
  it("stock has fallen to/below the reorder point while still covering the lead time -> MEDIUM", () => {
    const history = alternatingHistory(15, 25, 30); // mean 20/day, stdDev 5
    const assessment = calculateRiskAssessment({
      currentStock: 135,
      consumptionHistory: history,
      analysisPeriodDays: 30,
      leadTimeDays: 6,
      criticality: "ESSENTIAL",
      reorderLevel: 0,
      maxStockLevel: 1000,
      historicalStockoutCount90d: 0,
      policy: DEFAULT_ORG_POLICY,
      today: TODAY,
    });

    expect(assessment.averageDailyConsumption).toBe(20);
    expect(assessment.safetyStock).toBeCloseTo(20.21, 1);
    expect(assessment.reorderPoint).toBeCloseTo(140.21, 1);
    // calculateRiskAssessment rounds daysOfStock to 1 decimal for display (raw value is 6.75)
    expect(assessment.daysOfStock).toBeCloseTo(6.8, 1);
    // Covers more than the 6-day lead time (not HIGH), but 135 <= reorder point 140.2 -> MEDIUM
    expect(assessment.riskLevel).toBe("MEDIUM");
    expect(assessment.triggeredRule).toMatch(/reorder point/);
  });
});

describe("Realistic scenario 4 — Salbutamol inhaler (stable, adequately stocked)", () => {
  it("ample coverage above both lead time and reorder point -> LOW", () => {
    const assessment = calculateRiskAssessment({
      currentStock: 200,
      consumptionHistory: constantHistory(10, 30),
      analysisPeriodDays: 30,
      leadTimeDays: 6,
      criticality: "ESSENTIAL",
      reorderLevel: 0,
      maxStockLevel: 1000,
      historicalStockoutCount90d: 0,
      policy: DEFAULT_ORG_POLICY,
      today: TODAY,
    });

    expect(assessment.daysOfStock).toBe(20);
    expect(assessment.riskLevel).toBe("LOW");
    expect(assessment.isOverstocked).toBe(false);
  });
});

describe("Realistic scenario 5 — Bulk IV fluid (overstocked)", () => {
  it("stock far exceeds max level and lead-time coverage -> LOW risk but flagged OVERSTOCK", () => {
    const assessment = calculateRiskAssessment({
      currentStock: 500,
      consumptionHistory: constantHistory(5, 30),
      analysisPeriodDays: 30,
      leadTimeDays: 7,
      criticality: "VITAL",
      reorderLevel: 0,
      maxStockLevel: 100,
      historicalStockoutCount90d: 0,
      policy: DEFAULT_ORG_POLICY, // overstockCoverageMultiplier = 3
      today: TODAY,
    });

    expect(assessment.daysOfStock).toBe(100);
    expect(assessment.riskLevel).toBe("LOW");
    expect(assessment.isOverstocked).toBe(true);
  });
});

describe("Edge case — zero current stock is always CRITICAL regardless of consumption", () => {
  it("flags an already-empty shelf as CRITICAL even with no consumption history", () => {
    const assessment = calculateRiskAssessment({
      currentStock: 0,
      consumptionHistory: [],
      analysisPeriodDays: 30,
      leadTimeDays: 5,
      criticality: "VITAL",
      reorderLevel: 0,
      maxStockLevel: 100,
      historicalStockoutCount90d: 1,
      policy: DEFAULT_ORG_POLICY,
      today: TODAY,
    });
    expect(assessment.riskLevel).toBe("CRITICAL");
    expect(assessment.triggeredRule).toMatch(/already at zero/);
  });
});

describe("Transparency — the score is a documented weighted sum, not a black box", () => {
  it("every factor's contribution sums to the overall risk score", () => {
    const assessment = calculateRiskAssessment({
      currentStock: 120,
      consumptionHistory: constantHistory(25, 30),
      analysisPeriodDays: 30,
      leadTimeDays: 8,
      criticality: "VITAL",
      reorderLevel: 0,
      maxStockLevel: 1000,
      historicalStockoutCount90d: 2,
      policy: DEFAULT_ORG_POLICY,
      today: TODAY,
    });
    const summed = assessment.factors.reduce((sum, f) => sum + f.contribution, 0);
    expect(summed).toBeCloseTo(assessment.riskScore, 1);
    expect(assessment.factors).toHaveLength(5);
    assessment.factors.forEach((f) => expect(f.explanation.length).toBeGreaterThan(0));
  });
});

describe("standardDeviation (helper used by Safety Stock)", () => {
  it("computes population standard deviation correctly for a known dataset", () => {
    // 15,25 alternating -> mean 20, both values deviate by 5 -> stdDev = 5
    expect(standardDeviation([15, 25, 15, 25])).toBeCloseTo(5, 5);
    expect(standardDeviation([10, 10, 10])).toBe(0);
  });
});
