// Alert Center engine (Phase 9). Reuses risk-engine.service for every risk
// number — this file only decides WHEN an Alert row should exist and keeps
// it in sync with live state (create when a condition starts, resolve when
// it stops), so the alert list is always a live reflection of the database,
// never a one-off snapshot.
import { daysUntilExpiry, type AlertType, type RiskLevel } from "@dsews/shared";
import { prisma } from "../lib/prisma";
import { assessOrganizationInventory, getOrgPolicy } from "./risk-engine.service";

async function upsertAlert(params: {
  orgId: string;
  drugId: string;
  locationId: string;
  type: AlertType;
  riskLevel?: RiskLevel;
  message: string;
  reasonSummary: string;
  riskScore?: number;
  daysRemaining?: number | null;
  projectedStockoutDate?: string | null;
  recommendedAction: string;
}) {
  const existing = await prisma.alert.findFirst({
    where: { orgId: params.orgId, drugId: params.drugId, locationId: params.locationId, type: params.type, isResolved: false },
  });
  const data = {
    riskLevel: params.riskLevel,
    message: params.message,
    reasonSummary: params.reasonSummary,
    riskScore: params.riskScore,
    daysRemaining: params.daysRemaining ?? undefined,
    projectedStockoutDate: params.projectedStockoutDate ? new Date(params.projectedStockoutDate) : undefined,
    recommendedAction: params.recommendedAction,
  };
  if (existing) {
    await prisma.alert.update({ where: { id: existing.id }, data });
  } else {
    await prisma.alert.create({
      data: {
        orgId: params.orgId,
        drugId: params.drugId,
        locationId: params.locationId,
        type: params.type,
        ...data,
      },
    });
  }
}

/** Resolves alerts of the given managed types that are no longer in typesStillActive.
 * Each call site only manages the types it is responsible for, so different passes
 * (risk-based vs. expiry vs. supplier-delay) never clobber each other's alerts. */
async function resolveStaleAlerts(
  orgId: string,
  drugId: string,
  locationId: string,
  managedTypes: AlertType[],
  typesStillActive: AlertType[]
) {
  const toResolve = managedTypes.filter((t) => !typesStillActive.includes(t));
  if (toResolve.length === 0) return;
  await prisma.alert.updateMany({
    where: { orgId, drugId, locationId, type: { in: toResolve }, isResolved: false },
    data: { isResolved: true },
  });
}

const RISK_MANAGED_TYPES: AlertType[] = ["CRITICAL", "HIGH_RISK", "REORDER", "OVERSTOCK"];

/** Re-syncs the Alert table with current inventory/expiry/procurement state for one org. Idempotent. */
export async function regenerateAlerts(orgId: string): Promise<{ created: number; active: number }> {
  const { items } = await assessOrganizationInventory(orgId);

  for (const item of items) {
    const active: AlertType[] = [];
    const level = item.assessment.riskLevel;

    if (level === "CRITICAL") {
      active.push("CRITICAL");
      await upsertAlert({
        orgId,
        drugId: item.drugId,
        locationId: item.locationId,
        type: "CRITICAL",
        riskLevel: level,
        message: `CRITICAL: ${item.genericName} ${item.strength} at ${item.locationName} is projected to stock out in ${item.assessment.daysOfStock ?? "?"} day(s).`,
        reasonSummary: item.reasonSummary,
        riskScore: item.assessment.riskScore,
        daysRemaining: item.assessment.daysOfStock,
        projectedStockoutDate: item.assessment.projectedStockoutDate,
        recommendedAction: item.recommendedAction,
      });
    } else if (level === "HIGH") {
      active.push("HIGH_RISK");
      await upsertAlert({
        orgId,
        drugId: item.drugId,
        locationId: item.locationId,
        type: "HIGH_RISK",
        riskLevel: level,
        message: `HIGH RISK: ${item.genericName} ${item.strength} at ${item.locationName} has ${item.assessment.daysOfStock} day(s) of stock remaining against a ${item.leadTimeDays}-day supplier lead time.`,
        reasonSummary: item.reasonSummary,
        riskScore: item.assessment.riskScore,
        daysRemaining: item.assessment.daysOfStock,
        projectedStockoutDate: item.assessment.projectedStockoutDate,
        recommendedAction: item.recommendedAction,
      });
    } else if (level === "MEDIUM") {
      active.push("REORDER");
      await upsertAlert({
        orgId,
        drugId: item.drugId,
        locationId: item.locationId,
        type: "REORDER",
        riskLevel: level,
        message: `REORDER ALERT: ${item.genericName} ${item.strength} at ${item.locationName} has fallen below the reorder point.`,
        reasonSummary: item.reasonSummary,
        riskScore: item.assessment.riskScore,
        daysRemaining: item.assessment.daysOfStock,
        projectedStockoutDate: item.assessment.projectedStockoutDate,
        recommendedAction: item.recommendedAction,
      });
    }

    if (item.assessment.isOverstocked) {
      active.push("OVERSTOCK");
      await upsertAlert({
        orgId,
        drugId: item.drugId,
        locationId: item.locationId,
        type: "OVERSTOCK",
        riskLevel: level,
        message: `OVERSTOCK ALERT: ${item.genericName} ${item.strength} at ${item.locationName} exceeds the configured maximum inventory coverage.`,
        reasonSummary: item.reasonSummary,
        riskScore: item.assessment.riskScore,
        daysRemaining: item.assessment.daysOfStock,
        recommendedAction: item.recommendedAction,
      });
    }

    await resolveStaleAlerts(orgId, item.drugId, item.locationId, RISK_MANAGED_TYPES, active);
  }

  // --- Expiry alerts (batch-level, deduped per drug/location) ---
  const policy = await getOrgPolicy(orgId);
  const batches = await prisma.batch.findMany({ where: { orgId }, include: { drug: true, location: true } });
  const expirySeen = new Map<string, AlertType[]>();
  for (const b of batches) {
    const key = `${b.drugId}:${b.locationId}`;
    const days = daysUntilExpiry(b.expiryDate.toISOString().slice(0, 10));
    const maxWindow = Math.max(...policy.expiryWindowsDays);
    if (days < 0) {
      await upsertAlert({
        orgId,
        drugId: b.drugId,
        locationId: b.locationId,
        type: "EXPIRED",
        message: `EXPIRED: Batch ${b.batchNumber} of ${b.drug.genericName} ${b.drug.strength} at ${b.location.name} expired ${Math.abs(days)} day(s) ago.`,
        reasonSummary: `Batch expiry date has passed; ${b.quantity} unit(s) (value ${(b.quantity * b.unitCost).toFixed(2)}) are unusable.`,
        recommendedAction: "Remove from usable stock and record a write-off/adjustment.",
      });
      expirySeen.set(key, [...(expirySeen.get(key) ?? []), "EXPIRED"]);
    } else if (days <= maxWindow) {
      await upsertAlert({
        orgId,
        drugId: b.drugId,
        locationId: b.locationId,
        type: "EXPIRY",
        message: `NEAR-EXPIRY: Batch ${b.batchNumber} of ${b.drug.genericName} ${b.drug.strength} at ${b.location.name} expires in ${days} day(s).`,
        reasonSummary: `Batch is within the configured ${maxWindow}-day expiry window.`,
        daysRemaining: days,
        recommendedAction: "Prioritize dispensing this batch (FEFO) or consider a return/exchange with the supplier.",
      });
      expirySeen.set(key, [...(expirySeen.get(key) ?? []), "EXPIRY"]);
    }
  }
  // Resolve any open EXPIRY/EXPIRED alert whose drug/location no longer has a batch in that state.
  const openExpiryAlerts = await prisma.alert.findMany({
    where: { orgId, type: { in: ["EXPIRY", "EXPIRED"] }, isResolved: false },
  });
  for (const a of openExpiryAlerts) {
    const key = `${a.drugId}:${a.locationId}`;
    if (!expirySeen.get(key)?.includes(a.type as AlertType)) {
      await prisma.alert.update({ where: { id: a.id }, data: { isResolved: true } });
    }
  }

  // --- Supplier delay alerts ---
  const overdueRequests = await prisma.purchaseRequest.findMany({
    where: { orgId, status: { in: ["ORDERED", "IN_TRANSIT"] }, expectedDeliveryDate: { lt: new Date() } },
    include: { drug: true, location: true, supplier: true },
  });
  for (const req of overdueRequests) {
    await upsertAlert({
      orgId,
      drugId: req.drugId,
      locationId: req.locationId,
      type: "SUPPLIER_DELAY",
      message: `SUPPLIER DELAY: Purchase request for ${req.drug.genericName} ${req.drug.strength} from ${req.supplier?.name ?? "supplier"} was expected by ${req.expectedDeliveryDate?.toISOString().slice(0, 10)}.`,
      reasonSummary: `Order status is still "${req.status}" past its expected delivery date.`,
      recommendedAction: "Contact the supplier for an updated ETA, or evaluate an alternate supplier.",
    });
  }
  const stillLateIds = new Set(overdueRequests.map((r) => `${r.drugId}:${r.locationId}`));
  const openDelayAlerts = await prisma.alert.findMany({ where: { orgId, type: "SUPPLIER_DELAY", isResolved: false } });
  for (const a of openDelayAlerts) {
    if (!stillLateIds.has(`${a.drugId}:${a.locationId}`)) {
      await prisma.alert.update({ where: { id: a.id }, data: { isResolved: true } });
    }
  }

  const active = await prisma.alert.count({ where: { orgId, isResolved: false } });
  return { created: active, active };
}

export interface AlertFilters {
  type?: string;
  riskLevel?: string;
  locationId?: string;
  isRead?: boolean;
  isResolved?: boolean;
}

export async function listAlerts(orgId: string, filters: AlertFilters) {
  return prisma.alert.findMany({
    where: {
      orgId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.riskLevel ? { riskLevel: filters.riskLevel } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
      isResolved: filters.isResolved ?? false,
    },
    include: { drug: true, location: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getUnreadCount(orgId: string) {
  return prisma.alert.count({ where: { orgId, isRead: false, isResolved: false } });
}

export async function markAlertRead(orgId: string, alertId: string) {
  const existing = await prisma.alert.findFirst({ where: { id: alertId, orgId } });
  if (!existing) return null;
  return prisma.alert.update({ where: { id: alertId }, data: { isRead: true } });
}

export async function markAllRead(orgId: string) {
  const result = await prisma.alert.updateMany({ where: { orgId, isRead: false }, data: { isRead: true } });
  return result.count;
}
