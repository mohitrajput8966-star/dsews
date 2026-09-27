// Internal stock-transfer recommendations (Phase 11H): when one location has a
// real shortage risk and another location genuinely has spare stock of the SAME
// drug, suggest moving inventory internally before recommending external
// procurement. Reuses the live risk assessment per item — nothing is duplicated
// or invented. Nothing is actually moved until a user creates AND completes a
// StockTransfer request.
import { prisma } from "../lib/prisma";
import { assessOrganizationInventory } from "./risk-engine.service";
import { writeAuditLog } from "./audit.service";

export interface TransferRecommendation {
  drugId: string;
  genericName: string;
  strength: string;
  fromLocationId: string;
  fromLocationName: string;
  fromSurplusUnits: number;
  toLocationId: string;
  toLocationName: string;
  toRiskLevel: string;
  toDaysOfStock: number | null;
  recommendedQuantity: number;
  note: string;
}

export async function recommendTransfers(orgId: string): Promise<TransferRecommendation[]> {
  const { items } = await assessOrganizationInventory(orgId);

  const byDrug = new Map<string, typeof items>();
  for (const item of items) {
    byDrug.set(item.drugId, [...(byDrug.get(item.drugId) ?? []), item]);
  }

  const recommendations: TransferRecommendation[] = [];

  for (const group of byDrug.values()) {
    if (group.length < 2) continue; // needs at least 2 locations to transfer between
    const shortages = group.filter((i) => i.assessment.riskLevel === "CRITICAL" || i.assessment.riskLevel === "HIGH");
    const excesses = group.filter((i) => i.assessment.riskLevel === "LOW" && i.currentStock > i.assessment.reorderPoint * 1.3);
    if (shortages.length === 0 || excesses.length === 0) continue;

    for (const shortage of shortages) {
      let remainingNeed = shortage.procurement.recommendedOrderQuantity;
      if (remainingNeed <= 0) continue;

      for (const excess of excesses) {
        if (excess.locationId === shortage.locationId || remainingNeed <= 0) continue;
        const surplus = Math.floor(excess.currentStock - excess.assessment.reorderPoint);
        if (surplus <= 0) continue;

        const qty = Math.min(surplus, remainingNeed);
        if (qty <= 0) continue;

        recommendations.push({
          drugId: shortage.drugId,
          genericName: shortage.genericName,
          strength: shortage.strength,
          fromLocationId: excess.locationId,
          fromLocationName: excess.locationName,
          fromSurplusUnits: surplus,
          toLocationId: shortage.locationId,
          toLocationName: shortage.locationName,
          toRiskLevel: shortage.assessment.riskLevel,
          toDaysOfStock: shortage.assessment.daysOfStock,
          recommendedQuantity: qty,
          note: `${excess.locationName} holds ${surplus} unit(s) of spare stock above its own reorder point — consider an internal transfer before external procurement.`,
        });
        remainingNeed -= qty;
      }
    }
  }

  return recommendations;
}

export async function createTransferRequest(
  orgId: string,
  input: { drugId: string; fromLocationId: string; toLocationId: string; quantity: number; reason?: string },
  userId: string
) {
  const transfer = await prisma.stockTransfer.create({
    data: {
      orgId,
      drugId: input.drugId,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      quantity: input.quantity,
      reason: input.reason,
      requestedById: userId,
      status: "REQUESTED",
    },
  });
  await writeAuditLog({ orgId, userId, action: "STOCK_TRANSFER_REQUESTED", entityType: "StockTransfer", entityId: transfer.id, newValue: transfer });
  return transfer;
}

export async function listTransfers(orgId: string, status?: string) {
  return prisma.stockTransfer.findMany({
    where: { orgId, ...(status ? { status } : {}) },
    include: { drug: true, fromLocation: true, toLocation: true, requestedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Records that a requested transfer has actually happened: moves stock between the two
 * InventoryItem rows and writes two StockMovement rows (TRANSFER_OUT / TRANSFER_IN). */
export async function completeTransfer(orgId: string, transferId: string, userId: string) {
  const transfer = await prisma.stockTransfer.findFirst({ where: { id: transferId, orgId } });
  if (!transfer) throw new Error("Transfer request not found.");
  if (transfer.status !== "REQUESTED") throw new Error(`Transfer is already ${transfer.status}.`);

  const [fromItem, toItem] = await Promise.all([
    prisma.inventoryItem.findFirst({ where: { orgId, drugId: transfer.drugId, locationId: transfer.fromLocationId } }),
    prisma.inventoryItem.findFirst({ where: { orgId, drugId: transfer.drugId, locationId: transfer.toLocationId } }),
  ]);
  if (!fromItem || !toItem) throw new Error("Inventory position missing at one of the transfer locations.");
  if (fromItem.currentStock < transfer.quantity) throw new Error("Source location no longer has enough stock for this transfer.");

  await prisma.$transaction([
    prisma.inventoryItem.update({ where: { id: fromItem.id }, data: { currentStock: { decrement: transfer.quantity } } }),
    prisma.inventoryItem.update({ where: { id: toItem.id }, data: { currentStock: { increment: transfer.quantity } } }),
    prisma.stockMovement.create({
      data: {
        orgId,
        drugId: transfer.drugId,
        locationId: transfer.fromLocationId,
        type: "TRANSFER_OUT",
        quantity: transfer.quantity,
        referenceType: "StockTransfer",
        referenceId: transfer.id,
        performedBy: userId,
      },
    }),
    prisma.stockMovement.create({
      data: {
        orgId,
        drugId: transfer.drugId,
        locationId: transfer.toLocationId,
        type: "TRANSFER_IN",
        quantity: transfer.quantity,
        referenceType: "StockTransfer",
        referenceId: transfer.id,
        performedBy: userId,
      },
    }),
    prisma.stockTransfer.update({ where: { id: transfer.id }, data: { status: "COMPLETED", completedAt: new Date() } }),
  ]);

  await writeAuditLog({ orgId, userId, action: "STOCK_TRANSFER_COMPLETED", entityType: "StockTransfer", entityId: transfer.id });
  return prisma.stockTransfer.findUniqueOrThrow({ where: { id: transfer.id } });
}

export async function cancelTransfer(orgId: string, transferId: string, userId: string) {
  const transfer = await prisma.stockTransfer.findFirst({ where: { id: transferId, orgId } });
  if (!transfer) throw new Error("Transfer request not found.");
  if (transfer.status !== "REQUESTED") throw new Error(`Transfer is already ${transfer.status}.`);
  const updated = await prisma.stockTransfer.update({ where: { id: transferId }, data: { status: "CANCELLED" } });
  await writeAuditLog({ orgId, userId, action: "STOCK_TRANSFER_CANCELLED", entityType: "StockTransfer", entityId: transferId });
  return updated;
}
