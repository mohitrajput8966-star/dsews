// Dashboard KPIs, charts and cross-cutting analytics (ABC/VED/FSN, expiry, category
// value, consumption trend). Reuses risk-engine.service for all risk-derived numbers
// rather than recomputing the risk formulas here.
import { classifyABC, classifyFSN, daysUntilExpiry, expiryBucket, type ABCCategory, type FSNCategory } from "@dsews/shared";
import { prisma } from "../lib/prisma";
import { assessOrganizationInventory, getOrgPolicy, ADC_WINDOW_DAYS } from "./risk-engine.service";

export interface DashboardFilters {
  locationId?: string;
  therapeuticCategory?: string;
  riskLevel?: string;
  abcCategory?: string;
  vedCategory?: string;
  supplierId?: string;
}

async function drugMetaMap(orgId: string) {
  const drugs = await prisma.drug.findMany({ where: { orgId } });
  return new Map(drugs.map((d) => [d.id, d]));
}

/** Drug-level ABC classification by annualized consumption value (adc x 365 x unitCost),
 * summed across all of that drug's locations — the standard Pareto definition, not just
 * a snapshot of stock value. */
async function computeAbcByDrug(orgId: string): Promise<Map<string, ABCCategory>> {
  const policy = await getOrgPolicy(orgId);
  const drugs = await prisma.drug.findMany({ where: { orgId } });
  const since = new Date();
  since.setDate(since.getDate() - ADC_WINDOW_DAYS);

  const values: { id: string; annualValue: number }[] = [];
  for (const drug of drugs) {
    const consumed = await prisma.consumptionHistory.aggregate({
      where: { drugId: drug.id, date: { gte: since } },
      _sum: { quantityConsumed: true },
    });
    const totalQty = consumed._sum.quantityConsumed ?? 0;
    const adc = totalQty / ADC_WINDOW_DAYS;
    values.push({ id: drug.id, annualValue: adc * 365 * drug.unitCost });
  }
  const classified = classifyABC(values, policy.abcThresholds.aCutoffPct, policy.abcThresholds.bCutoffPct);
  return new Map(Object.entries(classified) as [string, ABCCategory][]);
}

/** Drug-level FSN classification from real consumption recency/frequency. */
async function computeFsnByDrug(orgId: string): Promise<Map<string, FSNCategory>> {
  const policy = await getOrgPolicy(orgId);
  const drugs = await prisma.drug.findMany({ where: { orgId } });
  const since = new Date();
  since.setDate(since.getDate() - policy.fsnNonMovingDays);

  const result = new Map<string, FSNCategory>();
  for (const drug of drugs) {
    const records = await prisma.consumptionHistory.findMany({
      where: { drugId: drug.id, date: { gte: since }, quantityConsumed: { gt: 0 } },
      orderBy: { date: "desc" },
    });
    const lastConsumptionDate = records[0]?.date.toISOString().slice(0, 10) ?? null;
    const distinctDays = new Set(records.map((r) => r.date.toISOString().slice(0, 10))).size;
    result.set(
      drug.id,
      classifyFSN(
        { id: drug.id, lastConsumptionDate, consumptionDaysCount: distinctDays, analysisPeriodDays: policy.fsnNonMovingDays },
        policy.fsnFastMovingDays,
        policy.fsnNonMovingDays
      )
    );
  }
  return result;
}

export async function getDashboard(orgId: string, filters: DashboardFilters) {
  const policy = await getOrgPolicy(orgId);
  const { items, summary } = await assessOrganizationInventory(orgId, { locationId: filters.locationId });
  const drugMeta = await drugMetaMap(orgId);
  const abcByDrug = await computeAbcByDrug(orgId);
  const vedByDrug = new Map(Array.from(drugMeta.values()).map((d) => [d.id, d.criticality]));

  let filteredItems = items;
  if (filters.therapeuticCategory) filteredItems = filteredItems.filter((i) => i.therapeuticCategory === filters.therapeuticCategory);
  if (filters.riskLevel) filteredItems = filteredItems.filter((i) => i.assessment.riskLevel === filters.riskLevel);
  if (filters.abcCategory) filteredItems = filteredItems.filter((i) => abcByDrug.get(i.drugId) === filters.abcCategory);
  if (filters.vedCategory) filteredItems = filteredItems.filter((i) => i.criticality === filters.vedCategory);
  if (filters.supplierId) {
    const items2 = await prisma.inventoryItem.findMany({ where: { orgId, supplierId: filters.supplierId }, select: { id: true } });
    const allowed = new Set(items2.map((i) => i.id));
    filteredItems = filteredItems.filter((i) => allowed.has(i.inventoryItemId));
  }

  // --- KPI cards ---
  const totalMedicines = drugMeta.size;
  const totalInventoryValue = filteredItems.reduce((sum, i) => sum + i.currentStock * i.unitCost, 0);
  const belowReorderPoint = filteredItems.filter((i) => i.currentStock <= i.assessment.reorderPoint).length;
  const projectedStockouts30d = filteredItems.filter((i) => {
    if (!i.assessment.projectedStockoutDate) return false;
    const days = (new Date(i.assessment.projectedStockoutDate).getTime() - Date.now()) / 86400000;
    return days <= 30;
  }).length;

  const batches = await prisma.batch.findMany({
    where: { orgId, ...(filters.locationId ? { locationId: filters.locationId } : {}) },
  });
  const today = new Date();
  const expired = batches.filter((b) => daysUntilExpiry(b.expiryDate.toISOString().slice(0, 10), today) < 0);
  const nearExpiry = batches.filter((b) => {
    const d = daysUntilExpiry(b.expiryDate.toISOString().slice(0, 10), today);
    return d >= 0 && d <= Math.max(...policy.expiryWindowsDays);
  });

  const openProcurementRequests = await prisma.purchaseRequest.count({
    where: { orgId, status: { notIn: ["RECEIVED", "CANCELLED", "REJECTED"] } },
  });

  // --- Charts ---
  const riskDistribution = [
    { level: "CRITICAL", count: filteredItems.filter((i) => i.assessment.riskLevel === "CRITICAL").length },
    { level: "HIGH", count: filteredItems.filter((i) => i.assessment.riskLevel === "HIGH").length },
    { level: "MEDIUM", count: filteredItems.filter((i) => i.assessment.riskLevel === "MEDIUM").length },
    { level: "LOW", count: filteredItems.filter((i) => i.assessment.riskLevel === "LOW").length },
  ];

  const top10AtRisk = [...filteredItems]
    .filter((i) => i.assessment.riskLevel === "CRITICAL" || i.assessment.riskLevel === "HIGH")
    .sort((a, b) => (a.assessment.daysOfStock ?? Infinity) - (b.assessment.daysOfStock ?? Infinity))
    .slice(0, 10)
    .map((i) => ({
      drugId: i.drugId,
      name: `${i.genericName} ${i.strength}`,
      locationName: i.locationName,
      daysOfStock: i.assessment.daysOfStock,
      riskLevel: i.assessment.riskLevel,
    }));

  const valueByCategory = new Map<string, number>();
  for (const i of filteredItems) {
    valueByCategory.set(i.therapeuticCategory, (valueByCategory.get(i.therapeuticCategory) ?? 0) + i.currentStock * i.unitCost);
  }
  const inventoryValueByCategory = Array.from(valueByCategory.entries())
    .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const consumptionTrendSince = new Date();
  consumptionTrendSince.setDate(consumptionTrendSince.getDate() - 30);
  const consumptionRows = await prisma.consumptionHistory.findMany({
    where: { orgId, date: { gte: consumptionTrendSince }, ...(filters.locationId ? { locationId: filters.locationId } : {}) },
  });
  const trendMap = new Map<string, number>();
  for (const row of consumptionRows) {
    const key = row.date.toISOString().slice(0, 10);
    trendMap.set(key, (trendMap.get(key) ?? 0) + row.quantityConsumed);
  }
  const consumptionTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, quantity]) => ({ date, quantity: Math.round(quantity * 100) / 100 }));

  const timelineBuckets = [
    { label: "0-7 days", max: 7, count: 0 },
    { label: "8-14 days", max: 14, count: 0 },
    { label: "15-30 days", max: 30, count: 0 },
    { label: "31-60 days", max: 60, count: 0 },
    { label: "60+ days / none", max: Infinity, count: 0 },
  ];
  for (const i of filteredItems) {
    if (!i.assessment.projectedStockoutDate) {
      timelineBuckets[timelineBuckets.length - 1].count++;
      continue;
    }
    const days = Math.ceil((new Date(i.assessment.projectedStockoutDate).getTime() - Date.now()) / 86400000);
    const bucket = timelineBuckets.find((b) => days <= b.max);
    (bucket ?? timelineBuckets[timelineBuckets.length - 1]).count++;
  }
  const stockoutTimeline = timelineBuckets.map(({ label, count }) => ({ label, count }));

  const abcCounts = { A: 0, B: 0, C: 0 };
  const vedCounts = { VITAL: 0, ESSENTIAL: 0, DESIRABLE: 0 };
  for (const drug of drugMeta.values()) {
    const abc = abcByDrug.get(drug.id);
    if (abc) abcCounts[abc]++;
    vedCounts[drug.criticality as keyof typeof vedCounts] = (vedCounts[drug.criticality as keyof typeof vedCounts] ?? 0) + 1;
  }

  // --- Today's Supply Chain Actions (generated, not hardcoded) ---
  const actions: { priority: number; text: string }[] = [];
  filteredItems
    .filter((i) => i.assessment.riskLevel === "CRITICAL")
    .slice(0, 5)
    .forEach((i) =>
      actions.push({
        priority: 1,
        text: `Order ${i.genericName} ${i.strength} at ${i.locationName} — stock-out expected in ${i.assessment.daysOfStock ?? "?"} day(s).`,
      })
    );
  filteredItems
    .filter((i) => i.assessment.riskLevel === "HIGH")
    .slice(0, 5)
    .forEach((i) =>
      actions.push({
        priority: 2,
        text: `Review ${i.genericName} ${i.strength} at ${i.locationName} — lead time exceeds remaining stock coverage.`,
      })
    );
  if (expired.length > 0) actions.push({ priority: 2, text: `Remove ${expired.length} expired batch(es) from usable stock.` });
  if (nearExpiry.length > 0) actions.push({ priority: 3, text: `Review ${nearExpiry.length} near-expiry batch(es) for priority use or return.` });
  const pendingApprovals = await prisma.purchaseRequest.count({ where: { orgId, status: "PENDING_APPROVAL" } });
  if (pendingApprovals > 0) actions.push({ priority: 2, text: `Approve ${pendingApprovals} pending purchase request(s).` });
  actions.sort((a, b) => a.priority - b.priority);

  return {
    kpis: {
      totalMedicines,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      criticalRisk: riskDistribution[0].count,
      highRisk: riskDistribution[1].count,
      belowReorderPoint,
      projectedStockouts30d,
      nearExpiry: nearExpiry.length,
      expired: expired.length,
      openProcurementRequests,
    },
    charts: {
      riskDistribution,
      top10AtRisk,
      consumptionTrend,
      inventoryValueByCategory,
      stockoutTimeline,
      abcDistribution: Object.entries(abcCounts).map(([category, count]) => ({ category, count })),
      vedDistribution: Object.entries(vedCounts).map(([category, count]) => ({ category, count })),
    },
    todaysActions: actions.slice(0, 8).map((a) => a.text),
  };
}

export async function getAbcVedMatrix(orgId: string) {
  const abcByDrug = await computeAbcByDrug(orgId);
  const drugs = await prisma.drug.findMany({ where: { orgId } });
  const matrix: Record<string, { drugId: string; genericName: string; strength: string }[]> = {};
  for (const drug of drugs) {
    const abc = abcByDrug.get(drug.id) ?? "C";
    const ved = drug.criticality === "VITAL" ? "V" : drug.criticality === "ESSENTIAL" ? "E" : "D";
    const key = `${abc}${ved}`;
    matrix[key] = matrix[key] ?? [];
    matrix[key].push({ drugId: drug.id, genericName: drug.genericName, strength: drug.strength });
  }
  return matrix;
}

export async function getFsnReport(orgId: string) {
  const fsnByDrug = await computeFsnByDrug(orgId);
  const drugs = await prisma.drug.findMany({ where: { orgId } });
  return drugs.map((d) => ({
    drugId: d.id,
    genericName: d.genericName,
    strength: d.strength,
    therapeuticCategory: d.therapeuticCategory,
    fsnCategory: fsnByDrug.get(d.id) ?? "N",
  }));
}

export async function getExpiryReport(orgId: string, locationId?: string) {
  const policy = await getOrgPolicy(orgId);
  const batches = await prisma.batch.findMany({
    where: { orgId, ...(locationId ? { locationId } : {}) },
    include: { drug: true, location: true },
    orderBy: { expiryDate: "asc" },
  });
  const today = new Date();
  return batches.map((b) => {
    const days = daysUntilExpiry(b.expiryDate.toISOString().slice(0, 10), today);
    return {
      batchId: b.id,
      drugId: b.drugId,
      genericName: b.drug.genericName,
      strength: b.drug.strength,
      batchNumber: b.batchNumber,
      locationName: b.location.name,
      quantity: b.quantity,
      expiryDate: b.expiryDate.toISOString().slice(0, 10),
      daysUntilExpiry: days,
      bucket: expiryBucket(days, policy.expiryWindowsDays),
      inventoryValueAtRisk: Math.round(b.quantity * b.unitCost * 100) / 100,
    };
  });
}

export async function getSupplierPerformance(orgId: string) {
  const suppliers = await prisma.supplier.findMany({ where: { orgId } });
  const result = [];
  for (const s of suppliers) {
    const [itemCount, requestCount, lateCount, receivedCount] = await Promise.all([
      prisma.inventoryItem.count({ where: { orgId, supplierId: s.id } }),
      prisma.purchaseRequest.count({ where: { orgId, supplierId: s.id } }),
      prisma.purchaseRequest.count({
        where: {
          orgId,
          supplierId: s.id,
          status: { in: ["ORDERED", "IN_TRANSIT"] },
          expectedDeliveryDate: { lt: new Date() },
        },
      }),
      prisma.purchaseRequest.count({ where: { orgId, supplierId: s.id, status: "RECEIVED" } }),
    ]);
    result.push({
      supplierId: s.id,
      name: s.name,
      avgLeadTimeDays: s.avgLeadTimeDays,
      onTimeDeliveryPct: s.onTimeDeliveryPct,
      reliabilityScore: s.reliabilityScore,
      itemsSupplied: itemCount,
      purchaseRequestCount: requestCount,
      currentlyOverdue: lateCount,
      received: receivedCount,
      riskCategory: s.reliabilityScore >= 80 ? "LOW" : s.reliabilityScore >= 60 ? "MEDIUM" : "HIGH",
    });
  }
  return result.sort((a, b) => a.reliabilityScore - b.reliabilityScore);
}
