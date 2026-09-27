// Procurement workflow (Phase 8): recommendation -> purchase request -> approval
// -> order -> receipt -> inventory update -> stock movement. Reuses risk-engine's
// recommendation output rather than recomputing quantity/cost/supplier here.
import { prisma } from "../lib/prisma";
import { assessInventoryItem } from "./risk-engine.service";
import { writeAuditLog } from "./audit.service";

const STATUS_FLOW: Record<string, string[]> = {
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ORDERED", "CANCELLED"],
  ORDERED: ["IN_TRANSIT", "RECEIVED", "CANCELLED"],
  IN_TRANSIT: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export class ProcurementError extends Error {}

/** Creates a purchase request directly from the risk engine's live recommendation for one inventory item. */
export async function createRequestFromRecommendation(orgId: string, inventoryItemId: string, userId: string, notes?: string) {
  const result = await assessInventoryItem(inventoryItemId, orgId);
  if (!result) throw new ProcurementError("Inventory item not found.");
  if (result.procurement.recommendedOrderQuantity <= 0) {
    throw new ProcurementError("Current stock already meets the target level — no order is recommended right now.");
  }

  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });

  const request = await prisma.purchaseRequest.create({
    data: {
      orgId,
      drugId: result.drugId,
      locationId: result.locationId,
      supplierId: item.supplierId,
      recommendedQty: result.procurement.recommendedOrderQuantity,
      requestedQty: result.procurement.recommendedOrderQuantity,
      unitCost: result.unitCost,
      estimatedCost: result.procurement.estimatedCost,
      status: "PENDING_APPROVAL",
      priority: result.assessment.riskLevel,
      expectedDeliveryDate: new Date(result.procurement.expectedDeliveryDate),
      requestedById: userId,
      notes,
    },
  });

  await writeAuditLog({
    orgId,
    userId,
    action: "PURCHASE_REQUEST_CREATED",
    entityType: "PurchaseRequest",
    entityId: request.id,
    newValue: request,
  });

  return request;
}

export interface PurchaseRequestFilters {
  status?: string;
  locationId?: string;
  supplierId?: string;
}

export async function listPurchaseRequests(orgId: string, filters: PurchaseRequestFilters) {
  return prisma.purchaseRequest.findMany({
    where: {
      orgId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    },
    include: { drug: true, location: true, supplier: true, requestedBy: { select: { name: true } }, approvedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Advances a purchase request's status. On -> RECEIVED, updates real inventory and records a StockMovement. */
export async function updateRequestStatus(
  orgId: string,
  requestId: string,
  newStatus: string,
  userId: string,
  receivedQty?: number
) {
  const request = await prisma.purchaseRequest.findFirst({ where: { id: requestId, orgId } });
  if (!request) throw new ProcurementError("Purchase request not found.");

  const allowed = STATUS_FLOW[request.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new ProcurementError(`Cannot move a request from ${request.status} to ${newStatus}.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === "APPROVED") data.approvedById = userId;

    const req = await tx.purchaseRequest.update({ where: { id: requestId }, data });

    if (newStatus === "RECEIVED") {
      const qty = receivedQty ?? request.requestedQty;
      const item = await tx.inventoryItem.findFirst({ where: { orgId, drugId: request.drugId, locationId: request.locationId } });
      if (item) {
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: { increment: qty },
            lastPurchaseDate: new Date(),
            lastPurchaseQty: qty,
            updatedBy: userId,
          },
        });
      }
      await tx.stockMovement.create({
        data: {
          orgId,
          drugId: request.drugId,
          locationId: request.locationId,
          type: "RECEIPT",
          quantity: qty,
          referenceType: "PurchaseRequest",
          referenceId: request.id,
          performedBy: userId,
          notes: `Received against purchase request ${request.id}`,
        },
      });
    }

    return req;
  });

  await writeAuditLog({
    orgId,
    userId,
    action: `PURCHASE_REQUEST_${newStatus}`,
    entityType: "PurchaseRequest",
    entityId: requestId,
    oldValue: { status: request.status },
    newValue: { status: newStatus },
  });

  return updated;
}
