// ============================================================================
// Reusable MedCare demo-org generator, extracted from prisma/seed.ts so it can
// be called both by the CLI seed script (full-DB reset) and by the in-app
// "Reset Demo Data" endpoint (scoped reset of just this one organization —
// see server/src/services/demo.service.ts). The generation logic itself is
// unchanged from the original Phase 2 seed.
// ============================================================================
import { PrismaClient } from "@prisma/client";
import {
  averageDailyConsumption,
  standardDeviation,
  leadTimeDemand,
  safetyStock,
  reorderPoint,
  calculateRiskAssessment,
  DEFAULT_ORG_POLICY,
  type ConsumptionRecord,
  type OrgPolicy,
} from "@dsews/shared";
import { hashPassword } from "../utils/auth";
import { SUPPLIERS } from "../data/seedData/suppliers";
import { DRUG_TUPLES, type DrugTuple, type Scenario, type FSN, type Volatility, type ExpiryTag, type PointOfUse } from "../data/seedData/drugs";

export const ANALYSIS_DAYS = 120;
export const ADC_WINDOW_DAYS = 30;

const MANUFACTURERS = [
  "Zenith Pharmaceuticals",
  "MedGen Laboratories",
  "Apex Biotech Ltd.",
  "Cureline Pharma",
  "Vitalis Formulations",
  "Nova Therapeutics",
  "Summit Generics",
  "PurePharma Industries",
];

const NOMINAL_STOCK_BY_UNIT: Record<string, number> = {
  TABLET: 300,
  CAPSULE: 150,
  VIAL: 20,
  AMPOULE: 25,
  SYRINGE: 15,
  INHALER: 10,
  BOTTLE: 40,
  TUBE: 15,
  SACHET: 60,
  SUSPENSION: 8,
};

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (Math.imul(31, h) + code.charCodeAt(i)) | 0;
  }
  return h;
}

function gaussianNoise(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const CV_BY_VOLATILITY: Record<Volatility, number> = { LOW: 0.12, MEDIUM: 0.25, HIGH: 0.4 };

const UNIT_ADC_RANGE: Record<string, [number, number]> = {
  TABLET: [40, 220],
  CAPSULE: [20, 90],
  VIAL: [4, 30],
  AMPOULE: [3, 25],
  SYRINGE: [3, 20],
  INHALER: [3, 15],
  BOTTLE: [40, 130],
  TUBE: [2, 8],
  SACHET: [15, 60],
  SUSPENSION: [2, 10],
};

function baseADCFor(unit: string, fsn: FSN, rng: () => number): number {
  if (fsn === "N") return 0;
  const [lo, hi] = UNIT_ADC_RANGE[unit] ?? [5, 30];
  const mid = fsn === "F" ? [lo + (hi - lo) * 0.45, hi] : [lo, lo + (hi - lo) * 0.4];
  return mid[0] + rng() * (mid[1] - mid[0]);
}

function generateConsumptionHistory(
  rng: () => number,
  baseADC: number,
  volatility: Volatility,
  trendPct: number,
  fsn: FSN
): ConsumptionRecord[] {
  const cv = CV_BY_VOLATILITY[volatility];
  const records: ConsumptionRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = ANALYSIS_DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const progress = (ANALYSIS_DAYS - 1 - i) / (ANALYSIS_DAYS - 1);

    let dayBase = baseADC * (1 + (trendPct / 100) * (progress - 0.5));

    if (fsn === "N") {
      dayBase = 0;
    } else if (fsn === "S") {
      const hasConsumptionToday = rng() < 0.3;
      dayBase = hasConsumptionToday ? dayBase / 0.3 : 0;
    }

    let qty = 0;
    if (dayBase > 0) {
      qty = Math.max(0, Math.round(dayBase + gaussianNoise(rng) * cv * dayBase));
    }

    records.push({ date: date.toISOString().slice(0, 10), quantity: qty });
  }

  return records;
}

function targetDaysOfStock(
  scenario: Scenario,
  leadTimeDays: number,
  ropDays: number,
  policy: OrgPolicy,
  rng: () => number
): number {
  const jitter = (lo: number, hi: number) => lo + rng() * Math.max(0, hi - lo);
  switch (scenario) {
    case "CRITICAL":
      return jitter(1, Math.max(1.5, policy.criticalDaysThreshold - 0.5));
    case "HIGH": {
      const hi = Math.min(leadTimeDays - 0.5, ropDays * 0.9);
      const lo = Math.min(hi - 0.25, Math.max(policy.criticalDaysThreshold + 0.5, leadTimeDays * 0.55));
      return jitter(lo, hi);
    }
    case "MEDIUM": {
      const lo = leadTimeDays * 1.05;
      const hi = Math.max(lo + 0.5, ropDays * 0.95);
      return jitter(lo, hi);
    }
    case "OVERSTOCK":
      return jitter(Math.max(ropDays * 3.5, leadTimeDays * 3.5), Math.max(ropDays * 5, leadTimeDays * 5));
    case "LOW":
    default: {
      const lo = Math.max(ropDays * 1.15, leadTimeDays * 1.6);
      const hi = Math.max(lo + 1, ropDays * 1.6, leadTimeDays * 2.4);
      return jitter(lo, hi);
    }
  }
}

function expiryDateFor(tag: ExpiryTag, rng: () => number): Date {
  const today = new Date();
  const addDays = (d: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt;
  };
  const jitter = (lo: number, hi: number) => Math.round(lo + rng() * (hi - lo));
  switch (tag) {
    case "EXPIRED":
      return addDays(-jitter(5, 20));
    case "EXP_30":
      return addDays(jitter(10, 29));
    case "EXP_60":
      return addDays(jitter(31, 59));
    case "EXP_90":
      return addDays(jitter(61, 89));
    case "NORMAL":
    default:
      return addDays(jitter(200, 730));
  }
}

export interface SeedSummary {
  orgId: string;
  drugCount: number;
  inventoryCount: number;
  batchCount: number;
  consumptionCount: number;
  riskSummary: Record<string, number>;
  mismatches: string[];
}

/** Creates a fresh "MedCare Multispecialty Hospital" organization with the full engineered demo dataset. */
export async function seedMedCareOrganization(prisma: PrismaClient): Promise<SeedSummary> {
  const org = await prisma.organization.create({
    data: {
      name: "MedCare Multispecialty Hospital",
      orgType: "HOSPITAL",
      primaryContactName: "Dr. Sarah Jennings",
      primaryContactEmail: "admin@dsews.com",
      primaryContactPhone: "+1-555-0100",
      currency: "USD",
      timezone: "America/New_York",
      isDemo: true,
      orgSetupComplete: true,
    },
  });

  const policy: OrgPolicy = DEFAULT_ORG_POLICY;
  await prisma.orgSettings.create({
    data: {
      orgId: org.id,
      serviceLevelZ: policy.serviceLevelZ,
      criticalDaysThreshold: policy.criticalDaysThreshold,
      reviewPeriodDays: policy.reviewPeriodDays,
      overstockCoverageMultiplier: policy.overstockCoverageMultiplier,
      defaultLeadTimeDays: policy.defaultLeadTimeDays,
      minOrderQuantityDefault: policy.minOrderQuantityDefault,
      abcACutoffPct: policy.abcThresholds.aCutoffPct,
      abcBCutoffPct: policy.abcThresholds.bCutoffPct,
      fsnFastMovingDays: policy.fsnFastMovingDays,
      fsnNonMovingDays: policy.fsnNonMovingDays,
      expiryWindowsDays: JSON.stringify(policy.expiryWindowsDays),
    },
  });

  const locationDefs: { key: PointOfUse | "CENTRAL_WAREHOUSE"; name: string; type: string; contactPerson: string }[] = [
    { key: "CENTRAL_WAREHOUSE", name: "Central Medical Store", type: "CENTRAL_WAREHOUSE", contactPerson: "Tom Becker" },
    { key: "IP_PHARMACY", name: "IP Pharmacy", type: "IP_PHARMACY", contactPerson: "Dr. Lisa Chen" },
    { key: "OP_PHARMACY", name: "OP Pharmacy", type: "OP_PHARMACY", contactPerson: "Dr. Lisa Chen" },
    { key: "EMERGENCY_PHARMACY", name: "Emergency Pharmacy", type: "EMERGENCY_PHARMACY", contactPerson: "Dr. James Okafor" },
    { key: "OT_STORE", name: "OT Store", type: "OT_STORE", contactPerson: "Tom Becker" },
  ];
  const locations: Record<string, { id: string }> = {};
  for (const loc of locationDefs) {
    locations[loc.key] = await prisma.location.create({
      data: { orgId: org.id, name: loc.name, type: loc.type, contactPerson: loc.contactPerson, isActive: true },
    });
  }

  const demoPasswordHash = await hashPassword("Demo@123");
  const demoUsers: { email: string; name: string; role: string; locationKey?: string }[] = [
    { email: "admin@dsews.com", name: "Priya Malhotra", role: "ADMIN" },
    { email: "scm@dsews.com", name: "Rajesh Kumar", role: "SUPPLY_CHAIN_MANAGER" },
    { email: "pharmacy@dsews.com", name: "Dr. Lisa Chen", role: "PHARMACY_MANAGER", locationKey: "OP_PHARMACY" },
    { email: "warehouse@dsews.com", name: "Tom Becker", role: "WAREHOUSE_MANAGER", locationKey: "CENTRAL_WAREHOUSE" },
    { email: "procurement@dsews.com", name: "Nadia Farouk", role: "PROCUREMENT_OFFICER" },
    { email: "hospitaladmin@dsews.com", name: "Dr. James Okafor", role: "HOSPITAL_ADMIN" },
    { email: "executive@dsews.com", name: "Meera Iyer", role: "EXECUTIVE" },
  ];
  for (const u of demoUsers) {
    await prisma.user.create({
      data: {
        orgId: org.id,
        email: u.email,
        passwordHash: demoPasswordHash,
        name: u.name,
        role: u.role,
        locationId: u.locationKey ? locations[u.locationKey].id : null,
      },
    });
  }
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: "admin@dsews.com" } });

  const supplierIdByKey: Record<string, string> = {};
  for (const s of SUPPLIERS) {
    const created = await prisma.supplier.create({
      data: {
        orgId: org.id,
        name: s.name,
        contactName: s.contactName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        avgLeadTimeDays: s.avgLeadTimeDays,
        onTimeDeliveryPct: s.onTimeDeliveryPct,
        reliabilityScore: s.reliabilityScore,
        notes: s.notes,
      },
    });
    supplierIdByKey[s.key] = created.id;
  }
  const supplierByKey = new Map(SUPPLIERS.map((s) => [s.key, s]));

  const SYSTEMIC_SHORTAGE_CODES = new Set(["AB-003", "DB-003", "CC-003"]);
  const riskSummary: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, OVERSTOCK_FLAG: 0 };
  const mismatches: string[] = [];

  for (const tuple of DRUG_TUPLES) {
    const [
      code,
      genericName,
      brandName,
      strength,
      dosageForm,
      category,
      unit,
      unitCost,
      criticality,
      pointOfUse,
      supplierKey,
      scenario,
      fsn,
      volatility,
      trendPct,
      expiryTag,
    ] = tuple as DrugTuple;

    const rng = mulberry32(hashSeed(code));
    const supplier = supplierByKey.get(supplierKey)!;
    const leadTimeDays = supplier.avgLeadTimeDays;

    const drug = await prisma.drug.create({
      data: {
        orgId: org.id,
        drugCode: code,
        genericName,
        brandName,
        strength,
        dosageForm,
        therapeuticCategory: category,
        manufacturer: MANUFACTURERS[Math.floor(rng() * MANUFACTURERS.length)],
        unit,
        unitCost,
        criticality,
      },
    });

    const baseADC = baseADCFor(unit, fsn, rng);
    const history = generateConsumptionHistory(rng, baseADC, volatility, trendPct, fsn);
    const last30 = history.slice(-ADC_WINDOW_DAYS);
    const actualADC = averageDailyConsumption(last30, ADC_WINDOW_DAYS);
    const stdDev30 = standardDeviation(last30.map((r) => r.quantity));

    let currentStock: number;
    let minStockLevel: number;
    let reorderLevel: number;
    let maxStockLevel: number;

    if (actualADC <= 0) {
      const nominal = NOMINAL_STOCK_BY_UNIT[unit] ?? 50;
      currentStock = nominal;
      minStockLevel = Math.round(nominal * 0.3);
      reorderLevel = Math.round(nominal * 0.5);
      maxStockLevel = Math.round(nominal * 1.5);
    } else {
      const ltDemand = leadTimeDemand(actualADC, leadTimeDays);
      const ss = safetyStock(policy.serviceLevelZ, stdDev30, leadTimeDays);
      const rop = reorderPoint(ltDemand, ss);
      const ropDays = rop / actualADC;
      const dosTarget = targetDaysOfStock(scenario, leadTimeDays, ropDays, policy, rng);
      currentStock = Math.max(0, Math.round(dosTarget * actualADC));
      minStockLevel = Math.round(ss);
      reorderLevel = Math.round(rop);
      maxStockLevel = Math.round(rop * (scenario === "OVERSTOCK" ? 1.6 : 2.5));
    }

    const lastPurchase = new Date();
    lastPurchase.setDate(lastPurchase.getDate() - Math.round(leadTimeDays * 1.5));

    await prisma.inventoryItem.create({
      data: {
        orgId: org.id,
        drugId: drug.id,
        locationId: locations[pointOfUse].id,
        supplierId: supplierIdByKey[supplierKey],
        currentStock,
        minStockLevel,
        reorderLevel,
        maxStockLevel,
        leadTimeDays,
        lastPurchaseDate: lastPurchase,
        lastPurchaseQty: reorderLevel > 0 ? reorderLevel : NOMINAL_STOCK_BY_UNIT[unit] ?? 50,
        updatedBy: adminUser.id,
      },
    });

    if (actualADC > 0) {
      await prisma.consumptionHistory.createMany({
        data: history.map((r) => ({
          orgId: org.id,
          drugId: drug.id,
          locationId: locations[pointOfUse].id,
          date: new Date(r.date),
          quantityConsumed: r.quantity,
        })),
      });
    }

    if (expiryTag === "EXPIRED" && currentStock > 0) {
      const expiredQty = Math.round(currentStock * 0.3);
      const freshQty = currentStock - expiredQty;
      await prisma.batch.create({
        data: {
          orgId: org.id,
          drugId: drug.id,
          locationId: locations[pointOfUse].id,
          batchNumber: `${code}-B1`,
          expiryDate: expiryDateFor("EXPIRED", rng),
          quantity: expiredQty,
          unitCost,
        },
      });
      if (freshQty > 0) {
        await prisma.batch.create({
          data: {
            orgId: org.id,
            drugId: drug.id,
            locationId: locations[pointOfUse].id,
            batchNumber: `${code}-B2`,
            expiryDate: expiryDateFor("NORMAL", rng),
            quantity: freshQty,
            unitCost,
          },
        });
      }
    } else if (currentStock > 0) {
      await prisma.batch.create({
        data: {
          orgId: org.id,
          drugId: drug.id,
          locationId: locations[pointOfUse].id,
          batchNumber: `${code}-B1`,
          expiryDate: expiryDateFor(expiryTag, rng),
          quantity: currentStock,
          unitCost,
        },
      });
    }

    const isSystemicShortage = SYSTEMIC_SHORTAGE_CODES.has(code);
    let warehouseStock: number;
    if (actualADC <= 0) {
      warehouseStock = NOMINAL_STOCK_BY_UNIT[unit] ?? 50;
    } else if (isSystemicShortage) {
      warehouseStock = Math.round(leadTimeDays * 1.5 * actualADC);
    } else if (scenario === "CRITICAL" || scenario === "HIGH") {
      warehouseStock = Math.round(leadTimeDays * 4 * actualADC);
    } else {
      warehouseStock = Math.round(leadTimeDays * 2 * actualADC);
    }
    const warehouseMin = Math.round(warehouseStock * 0.2);
    const warehouseReorder = Math.round(warehouseStock * 0.4);
    const warehouseMax = Math.round(warehouseStock * 1.8);

    await prisma.inventoryItem.create({
      data: {
        orgId: org.id,
        drugId: drug.id,
        locationId: locations.CENTRAL_WAREHOUSE.id,
        supplierId: supplierIdByKey[supplierKey],
        currentStock: warehouseStock,
        minStockLevel: warehouseMin,
        reorderLevel: warehouseReorder,
        maxStockLevel: warehouseMax,
        leadTimeDays,
        lastPurchaseDate: lastPurchase,
        lastPurchaseQty: warehouseReorder || (NOMINAL_STOCK_BY_UNIT[unit] ?? 50),
        updatedBy: adminUser.id,
      },
    });

    if (warehouseStock > 0) {
      await prisma.batch.create({
        data: {
          orgId: org.id,
          drugId: drug.id,
          locationId: locations.CENTRAL_WAREHOUSE.id,
          batchNumber: `${code}-WH1`,
          expiryDate: expiryDateFor("NORMAL", rng),
          quantity: warehouseStock,
          unitCost,
        },
      });
    }

    const assessment = calculateRiskAssessment({
      currentStock,
      consumptionHistory: last30,
      analysisPeriodDays: ADC_WINDOW_DAYS,
      leadTimeDays,
      criticality,
      reorderLevel,
      maxStockLevel,
      historicalStockoutCount90d: 0,
      policy,
    });

    if (scenario === "OVERSTOCK") {
      riskSummary.OVERSTOCK_FLAG += assessment.isOverstocked ? 1 : 0;
      if (!assessment.isOverstocked)
        mismatches.push(`${code} (${genericName}): expected OVERSTOCK flag, got riskLevel=${assessment.riskLevel} overstocked=${assessment.isOverstocked}`);
    } else {
      riskSummary[assessment.riskLevel] = (riskSummary[assessment.riskLevel] ?? 0) + 1;
      if (assessment.riskLevel !== scenario) {
        mismatches.push(`${code} (${genericName}): expected ${scenario}, engine computed ${assessment.riskLevel} (dos=${assessment.daysOfStock}, LT=${leadTimeDays})`);
      }
    }
  }

  const [drugCount, inventoryCount, batchCount, consumptionCount] = await Promise.all([
    prisma.drug.count({ where: { orgId: org.id } }),
    prisma.inventoryItem.count({ where: { orgId: org.id } }),
    prisma.batch.count({ where: { orgId: org.id } }),
    prisma.consumptionHistory.count({ where: { orgId: org.id } }),
  ]);

  return { orgId: org.id, drugCount, inventoryCount, batchCount, consumptionCount, riskSummary, mismatches };
}
