// CLI entry point for `npm run db:seed` / `npm run db:reset`. The actual
// generation logic lives in ./seedData/seedMedCare.ts so the same code can be
// reused by the in-app "Reset Demo Data" endpoint (server/src/services/demo.service.ts)
// without shelling out to this script or wiping other organizations.
import { PrismaClient } from "@prisma/client";
import { seedMedCareOrganization, ANALYSIS_DAYS } from "../src/services/demo-seed.service";

const prisma = new PrismaClient();

async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.forecastResult.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.consumptionHistory.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.drug.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.orgSettings.deleteMany();
  await prisma.organization.deleteMany();
}

async function main() {
  console.log("Clearing existing data...");
  await clearDatabase();

  console.log("Creating MedCare Multispecialty Hospital demo organization...");
  const summary = await seedMedCareOrganization(prisma);

  console.log("\n=== Seed sanity check: risk engine re-run against seeded data ===");
  console.log(summary.riskSummary);
  if (summary.mismatches.length > 0) {
    console.log(`\n${summary.mismatches.length} scenario mismatch(es):`);
    summary.mismatches.forEach((m) => console.log(`  - ${m}`));
  } else {
    console.log("All drugs classified exactly as intended. ✅");
  }

  console.log(
    `\nSeed complete: ${summary.drugCount} drugs, ${summary.inventoryCount} inventory positions, ${summary.batchCount} batches, ${summary.consumptionCount} consumption records across ${ANALYSIS_DAYS} days.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
