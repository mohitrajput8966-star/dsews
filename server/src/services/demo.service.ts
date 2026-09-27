// "Reset Demo Data" (Phase 14): scoped to the caller's own demo organization
// only — deletes that Organization row (cascades to every child table) and
// regenerates it fresh via the same generator the CLI seed script uses.
// Never touches any other organization's data.
import { prisma } from "../lib/prisma";
import { seedMedCareOrganization } from "./demo-seed.service";
import { writeAuditLog } from "./audit.service";

export class DemoResetError extends Error {}

export async function resetDemoData(orgId: string, requestedByUserId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new DemoResetError("Organization not found.");
  if (!org.isDemo) {
    throw new DemoResetError("Reset Demo Data is only available for demo organizations.");
  }

  // Cascades to every child row of this org (locations, users, drugs, inventory,
  // batches, consumption history, purchase requests, alerts, audit logs, ...).
  await prisma.organization.delete({ where: { id: orgId } });

  const summary = await seedMedCareOrganization(prisma);

  await writeAuditLog({
    orgId: summary.orgId,
    userId: null, // the pre-reset user id no longer exists after the cascade delete
    action: "DEMO_DATA_RESET",
    entityType: "Organization",
    entityId: summary.orgId,
    newValue: { drugCount: summary.drugCount, inventoryCount: summary.inventoryCount, requestedBy: requestedByUserId },
  });

  return summary;
}
