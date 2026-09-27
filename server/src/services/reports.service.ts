// Reports (Phase 10). Every report is assembled from the same live services the
// rest of the app uses (risk engine, analytics, procurement) — no separate
// report-only data path that could drift from what the UI shows.
import { prisma } from "../lib/prisma";
import { assessOrganizationInventory, getOrgPolicy } from "./risk-engine.service";
import { getExpiryReport, getAbcVedMatrix, getSupplierPerformance } from "./analytics.service";
import { listPurchaseRequests } from "./procurement.service";

export const REPORT_KEYS = ["risk", "inventory", "expiry", "procurement", "abc-ved", "supplier"] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export interface ReportFilters {
  locationId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function getReportRows(key: ReportKey, orgId: string, filters: ReportFilters): Promise<Record<string, unknown>[]> {
  switch (key) {
    case "risk": {
      const { items } = await assessOrganizationInventory(orgId, { locationId: filters.locationId });
      return items.map((i) => ({
        drug: `${i.genericName} ${i.strength}`,
        location: i.locationName,
        currentStock: i.currentStock,
        adc: i.assessment.averageDailyConsumption,
        daysOfStock: i.assessment.daysOfStock ?? "",
        leadTimeDays: i.leadTimeDays,
        safetyStock: i.assessment.safetyStock,
        reorderPoint: i.assessment.reorderPoint,
        projectedStockoutDate: i.assessment.projectedStockoutDate ?? "",
        riskLevel: i.assessment.riskLevel,
        riskScore: i.assessment.riskScore,
        recommendedOrderQty: i.procurement.recommendedOrderQuantity,
        estimatedCost: i.procurement.estimatedCost,
        supplier: i.supplierName ?? "",
      }));
    }
    case "inventory": {
      const rows = await prisma.inventoryItem.findMany({
        where: { orgId, ...(filters.locationId ? { locationId: filters.locationId } : {}) },
        include: { drug: true, location: true, supplier: true },
      });
      return rows.map((r) => ({
        drug: `${r.drug.genericName} ${r.drug.strength}`,
        category: r.drug.therapeuticCategory,
        location: r.location.name,
        currentStock: r.currentStock,
        minStockLevel: r.minStockLevel,
        reorderLevel: r.reorderLevel,
        maxStockLevel: r.maxStockLevel,
        leadTimeDays: r.leadTimeDays,
        unitCost: r.drug.unitCost,
        inventoryValue: Math.round(r.currentStock * r.drug.unitCost * 100) / 100,
        supplier: r.supplier?.name ?? "",
        lastPurchaseDate: r.lastPurchaseDate?.toISOString().slice(0, 10) ?? "",
      }));
    }
    case "expiry": {
      const rows = await getExpiryReport(orgId, filters.locationId);
      return rows.map((r) => ({
        drug: `${r.genericName} ${r.strength}`,
        batchNumber: r.batchNumber,
        location: r.locationName,
        quantity: r.quantity,
        expiryDate: r.expiryDate,
        daysUntilExpiry: r.daysUntilExpiry,
        bucket: r.bucket,
        inventoryValueAtRisk: r.inventoryValueAtRisk,
      }));
    }
    case "procurement": {
      const rows = await listPurchaseRequests(orgId, { locationId: filters.locationId });
      const filtered = rows.filter((r) => {
        if (filters.fromDate && r.createdAt < new Date(filters.fromDate)) return false;
        if (filters.toDate && r.createdAt > new Date(filters.toDate)) return false;
        return true;
      });
      return filtered.map((r) => ({
        drug: `${r.drug.genericName} ${r.drug.strength}`,
        location: r.location.name,
        supplier: r.supplier?.name ?? "",
        status: r.status,
        priority: r.priority,
        requestedQty: r.requestedQty,
        estimatedCost: r.estimatedCost,
        expectedDeliveryDate: r.expectedDeliveryDate?.toISOString().slice(0, 10) ?? "",
        requestedBy: r.requestedBy?.name ?? "",
        approvedBy: r.approvedBy?.name ?? "",
        createdAt: r.createdAt.toISOString().slice(0, 10),
      }));
    }
    case "abc-ved": {
      const matrix = await getAbcVedMatrix(orgId);
      const rows: Record<string, unknown>[] = [];
      for (const [key, drugs] of Object.entries(matrix)) {
        for (const d of drugs) {
          rows.push({ segment: key, abc: key[0], ved: key[1], drug: `${d.genericName} ${d.strength}` });
        }
      }
      return rows;
    }
    case "supplier": {
      const rows = await getSupplierPerformance(orgId);
      return rows.map((r) => ({
        supplier: r.name,
        avgLeadTimeDays: r.avgLeadTimeDays,
        onTimeDeliveryPct: r.onTimeDeliveryPct,
        reliabilityScore: r.reliabilityScore,
        itemsSupplied: r.itemsSupplied,
        purchaseRequestCount: r.purchaseRequestCount,
        currentlyOverdue: r.currentlyOverdue,
        received: r.received,
        riskCategory: r.riskCategory,
      }));
    }
  }
}

export async function getReportTitle(key: ReportKey, orgId: string): Promise<string> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const titles: Record<ReportKey, string> = {
    risk: "Drug Shortage Risk Report",
    inventory: "Inventory Status Report",
    expiry: "Expiry Risk Report",
    procurement: "Procurement Recommendation Report",
    "abc-ved": "ABC-VED Report",
    supplier: "Supplier Performance Report",
  };
  return `${titles[key]} — ${org?.name ?? ""}`;
}

// getOrgPolicy re-exported for reports.controller convenience (date-stamping, thresholds display)
export { getOrgPolicy };
