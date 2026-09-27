import { Request, Response } from "express";
import { z } from "zod";
import {
  listInventory,
  listBatches,
  listStockMovements,
  createDrugWithInventory,
  updateInventoryItem,
  deactivateDrug,
  buildCsvTemplate,
  importInventoryCsv,
} from "../services/inventory.service";
import { asyncHandler, AppError } from "../utils/errors";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const filterSchema = z.object({ locationId: z.string().optional(), therapeuticCategory: z.string().optional(), search: z.string().optional() });
  const filters = filterSchema.parse(req.query);
  const items = await listInventory(req.user!.orgId, filters);
  res.json({ items });
});

export const batches = asyncHandler(async (req: Request, res: Response) => {
  const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
  const rows = await listBatches(req.user!.orgId, locationId);
  res.json({ batches: rows });
});

export const movements = asyncHandler(async (req: Request, res: Response) => {
  const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
  const drugId = typeof req.query.drugId === "string" ? req.query.drugId : undefined;
  const rows = await listStockMovements(req.user!.orgId, locationId, drugId);
  res.json({ movements: rows });
});

const createSchema = z.object({
  drugCode: z.string().min(1),
  genericName: z.string().min(1),
  brandName: z.string().optional(),
  strength: z.string().min(1),
  dosageForm: z.string().min(1),
  therapeuticCategory: z.string().min(1),
  manufacturer: z.string().min(1),
  unit: z.string().min(1),
  unitCost: z.number().nonnegative(),
  criticality: z.enum(["VITAL", "ESSENTIAL", "DESIRABLE"]),
  locationId: z.string().min(1),
  currentStock: z.number().nonnegative(),
  minStockLevel: z.number().nonnegative(),
  reorderLevel: z.number().nonnegative(),
  maxStockLevel: z.number().nonnegative(),
  leadTimeDays: z.number().positive(),
  supplierId: z.string().optional(),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body);
  const result = await createDrugWithInventory(req.user!.orgId, input, req.user!.id);
  res.status(201).json(result);
});

const updateSchema = z.object({
  currentStock: z.number().nonnegative().optional(),
  minStockLevel: z.number().nonnegative().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  maxStockLevel: z.number().nonnegative().optional(),
  leadTimeDays: z.number().positive().optional(),
  supplierId: z.string().nullable().optional(),
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = updateSchema.parse(req.body);
  const item = await updateInventoryItem(req.user!.orgId, req.params.id, input, req.user!.id);
  if (!item) throw new AppError(404, "Inventory item not found.");
  res.json({ item });
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const drug = await deactivateDrug(req.user!.orgId, req.params.drugId, req.user!.id);
  if (!drug) throw new AppError(404, "Drug not found.");
  res.json({ drug });
});

export const csvTemplate = (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="dsews-inventory-template.csv"');
  res.send(buildCsvTemplate());
};

export const csvImport = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) throw new AppError(400, "No file uploaded.");
  const result = await importInventoryCsv(req.user!.orgId, file.buffer, req.user!.id);
  res.json(result);
});
