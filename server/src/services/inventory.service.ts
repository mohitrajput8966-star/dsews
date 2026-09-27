// Inventory CRUD, batch/stock-movement listing, and CSV import (Phase 18-equivalent
// of the original spec — validated import with per-row error reporting).
import { parse } from "csv-parse/sync";
import { prisma } from "../lib/prisma";
import { writeAuditLog } from "./audit.service";

export interface InventoryFilters {
  locationId?: string;
  therapeuticCategory?: string;
  search?: string;
}

export async function listInventory(orgId: string, filters: InventoryFilters) {
  return prisma.inventoryItem.findMany({
    where: {
      orgId,
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.therapeuticCategory ? { drug: { therapeuticCategory: filters.therapeuticCategory } } : {}),
      ...(filters.search
        ? {
            drug: {
              OR: [
                { genericName: { contains: filters.search } },
                { brandName: { contains: filters.search } },
                { drugCode: { contains: filters.search } },
              ],
            },
          }
        : {}),
    },
    include: { drug: true, location: true, supplier: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listBatches(orgId: string, locationId?: string) {
  return prisma.batch.findMany({
    where: { orgId, ...(locationId ? { locationId } : {}) },
    include: { drug: true, location: true },
    orderBy: { expiryDate: "asc" },
  });
}

export async function listStockMovements(orgId: string, locationId?: string, drugId?: string) {
  return prisma.stockMovement.findMany({
    where: { orgId, ...(locationId ? { locationId } : {}), ...(drugId ? { drugId } : {}) },
    include: { drug: true, location: true },
    orderBy: { occurredAt: "desc" },
    take: 200,
  });
}

const CREATE_DRUG_FIELDS = [
  "drugCode",
  "genericName",
  "strength",
  "dosageForm",
  "therapeuticCategory",
  "manufacturer",
  "unit",
  "unitCost",
  "criticality",
] as const;

export interface CreateDrugInput {
  drugCode: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dosageForm: string;
  therapeuticCategory: string;
  manufacturer: string;
  unit: string;
  unitCost: number;
  criticality: string;
  locationId: string;
  currentStock: number;
  minStockLevel: number;
  reorderLevel: number;
  maxStockLevel: number;
  leadTimeDays: number;
  supplierId?: string;
}

export async function createDrugWithInventory(orgId: string, input: CreateDrugInput, userId: string) {
  const drug = await prisma.drug.create({
    data: {
      orgId,
      drugCode: input.drugCode,
      genericName: input.genericName,
      brandName: input.brandName,
      strength: input.strength,
      dosageForm: input.dosageForm,
      therapeuticCategory: input.therapeuticCategory,
      manufacturer: input.manufacturer,
      unit: input.unit,
      unitCost: input.unitCost,
      criticality: input.criticality,
      updatedBy: userId,
    },
  });
  const item = await prisma.inventoryItem.create({
    data: {
      orgId,
      drugId: drug.id,
      locationId: input.locationId,
      supplierId: input.supplierId,
      currentStock: input.currentStock,
      minStockLevel: input.minStockLevel,
      reorderLevel: input.reorderLevel,
      maxStockLevel: input.maxStockLevel,
      leadTimeDays: input.leadTimeDays,
      updatedBy: userId,
    },
  });
  await writeAuditLog({ orgId, userId, action: "DRUG_CREATED", entityType: "Drug", entityId: drug.id, newValue: drug });
  return { drug, item };
}

export async function updateInventoryItem(
  orgId: string,
  inventoryItemId: string,
  input: Partial<{ currentStock: number; minStockLevel: number; reorderLevel: number; maxStockLevel: number; leadTimeDays: number; supplierId: string | null }>,
  userId: string
) {
  const existing = await prisma.inventoryItem.findFirst({ where: { id: inventoryItemId, orgId } });
  if (!existing) return null;
  const updated = await prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { ...input, updatedBy: userId } });
  await writeAuditLog({
    orgId,
    userId,
    action: "INVENTORY_UPDATED",
    entityType: "InventoryItem",
    entityId: inventoryItemId,
    oldValue: existing,
    newValue: updated,
  });
  return updated;
}

export async function deactivateDrug(orgId: string, drugId: string, userId: string) {
  const existing = await prisma.drug.findFirst({ where: { id: drugId, orgId } });
  if (!existing) return null;
  // Soft-deactivate: zero out inventory positions rather than deleting a drug that
  // may have consumption/batch/purchase history — deleting would violate referential
  // integrity with real transaction history, matching the "deactivate, don't delete" rule.
  await prisma.inventoryItem.updateMany({ where: { orgId, drugId }, data: { maxStockLevel: 0 } });
  await writeAuditLog({ orgId, userId, action: "DRUG_DEACTIVATED", entityType: "Drug", entityId: drugId, oldValue: existing });
  return existing;
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export const CSV_TEMPLATE_HEADERS = [
  "Drug ID",
  "Generic Name",
  "Brand Name",
  "Strength",
  "Dosage Form",
  "Category",
  "Manufacturer",
  "Unit",
  "Unit Cost",
  "Criticality",
  "Location",
  "Current Stock",
  "Daily Consumption",
  "Lead Time",
  "Safety Stock",
  "Max Stock",
  "Supplier",
];

export function buildCsvTemplate(): string {
  const example = [
    "AB-999",
    "Example Drug",
    "Examplin",
    "500 mg",
    "TABLET",
    "Antibiotics",
    "Example Pharma",
    "TABLET",
    "0.10",
    "ESSENTIAL",
    "Central Medical Store",
    "500",
    "20",
    "7",
    "50",
    "1000",
    "",
  ];
  return [CSV_TEMPLATE_HEADERS.join(","), example.join(",")].join("\n");
}

export interface CsvRowError {
  row: number;
  errors: string[];
}

export interface CsvImportResult {
  totalRows: number;
  importedCount: number;
  errors: CsvRowError[];
}

export async function importInventoryCsv(orgId: string, fileBuffer: Buffer, userId: string): Promise<CsvImportResult> {
  let records: Record<string, string>[];
  try {
    records = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    return { totalRows: 0, importedCount: 0, errors: [{ row: 0, errors: [`Could not parse CSV: ${(e as Error).message}`] }] };
  }

  const missingHeaders = CSV_TEMPLATE_HEADERS.filter((h) => !["Brand Name", "Supplier", "Max Stock", "Safety Stock"].includes(h)).filter(
    (h) => records.length > 0 && !(h in records[0])
  );
  if (missingHeaders.length > 0) {
    return { totalRows: records.length, importedCount: 0, errors: [{ row: 0, errors: [`Missing required column(s): ${missingHeaders.join(", ")}`] }] };
  }

  const [locations, suppliers, existingDrugs] = await Promise.all([
    prisma.location.findMany({ where: { orgId } }),
    prisma.supplier.findMany({ where: { orgId } }),
    prisma.drug.findMany({ where: { orgId } }),
  ]);
  const locationByName = new Map(locations.map((l) => [l.name.toLowerCase(), l]));
  const supplierByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s]));
  const existingDrugCodes = new Set(existingDrugs.map((d) => d.drugCode));

  const errors: CsvRowError[] = [];
  const seenCodes = new Set<string>();
  const validRows: { row: Record<string, string>; index: number }[] = [];

  records.forEach((row, idx) => {
    const rowErrors: string[] = [];
    const rowNum = idx + 2; // +1 for header row, +1 for 1-indexing

    const drugId = row["Drug ID"]?.trim();
    if (!drugId) rowErrors.push("Drug ID is required.");
    else if (seenCodes.has(drugId)) rowErrors.push(`Duplicate Drug ID "${drugId}" within this file.`);
    else if (existingDrugCodes.has(drugId)) rowErrors.push(`Drug ID "${drugId}" already exists for this organization.`);
    if (drugId) seenCodes.add(drugId);

    if (!row["Generic Name"]?.trim()) rowErrors.push("Generic Name is required.");
    if (!row["Strength"]?.trim()) rowErrors.push("Strength is required.");
    if (!row["Dosage Form"]?.trim()) rowErrors.push("Dosage Form is required.");
    if (!row["Category"]?.trim()) rowErrors.push("Category is required.");
    if (!row["Manufacturer"]?.trim()) rowErrors.push("Manufacturer is required.");
    if (!row["Unit"]?.trim()) rowErrors.push("Unit is required.");

    const location = locationByName.get((row["Location"] ?? "").trim().toLowerCase());
    if (!location) rowErrors.push(`Location "${row["Location"]}" does not match any active location.`);

    const numericFields: [string, boolean][] = [
      ["Unit Cost", false],
      ["Current Stock", false],
      ["Daily Consumption", false],
      ["Lead Time", false],
    ];
    for (const [field, allowEmpty] of numericFields) {
      const raw = row[field]?.trim();
      if (!raw) {
        if (!allowEmpty) rowErrors.push(`${field} is required.`);
        continue;
      }
      const n = Number(raw);
      if (Number.isNaN(n)) rowErrors.push(`${field} must be a number.`);
      else if (n < 0) rowErrors.push(`${field} cannot be negative.`);
    }

    const criticality = (row["Criticality"] || "ESSENTIAL").trim().toUpperCase();
    if (!["VITAL", "ESSENTIAL", "DESIRABLE"].includes(criticality)) {
      rowErrors.push(`Criticality must be VITAL, ESSENTIAL, or DESIRABLE (got "${row["Criticality"]}").`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, errors: rowErrors });
    } else {
      validRows.push({ row, index: idx });
    }
  });

  let importedCount = 0;
  for (const { row } of validRows) {
    const location = locationByName.get(row["Location"].trim().toLowerCase())!;
    const supplier = row["Supplier"] ? supplierByName.get(row["Supplier"].trim().toLowerCase()) : undefined;
    const unitCost = Number(row["Unit Cost"]);
    const currentStock = Number(row["Current Stock"]);
    const leadTimeDays = Number(row["Lead Time"]);
    const safetyStock = Number(row["Safety Stock"] || 0);
    const maxStock = Number(row["Max Stock"] || currentStock * 3);

    const drug = await prisma.drug.create({
      data: {
        orgId,
        drugCode: row["Drug ID"].trim(),
        genericName: row["Generic Name"].trim(),
        brandName: row["Brand Name"]?.trim() || null,
        strength: row["Strength"].trim(),
        dosageForm: row["Dosage Form"].trim().toUpperCase(),
        therapeuticCategory: row["Category"].trim(),
        manufacturer: row["Manufacturer"].trim(),
        unit: row["Unit"].trim().toUpperCase(),
        unitCost,
        criticality: (row["Criticality"] || "ESSENTIAL").trim().toUpperCase(),
        updatedBy: userId,
      },
    });

    await prisma.inventoryItem.create({
      data: {
        orgId,
        drugId: drug.id,
        locationId: location.id,
        supplierId: supplier?.id,
        currentStock,
        minStockLevel: safetyStock,
        reorderLevel: safetyStock + Number(row["Daily Consumption"]) * leadTimeDays,
        maxStockLevel: maxStock,
        leadTimeDays,
        updatedBy: userId,
      },
    });

    importedCount++;
  }

  await writeAuditLog({
    orgId,
    userId,
    action: "INVENTORY_CSV_IMPORTED",
    entityType: "Drug",
    entityId: "bulk-import",
    newValue: { totalRows: records.length, importedCount, errorCount: errors.length },
  });

  return { totalRows: records.length, importedCount, errors };
}
