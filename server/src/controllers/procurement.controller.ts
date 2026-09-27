import { Request, Response } from "express";
import { z } from "zod";
import { createRequestFromRecommendation, listPurchaseRequests, updateRequestStatus, ProcurementError } from "../services/procurement.service";
import { asyncHandler, AppError } from "../utils/errors";

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const filterSchema = z.object({ status: z.string().optional(), locationId: z.string().optional(), supplierId: z.string().optional() });
  const filters = filterSchema.parse(req.query);
  const requests = await listPurchaseRequests(req.user!.orgId, filters);
  res.json({ requests });
});

const createSchema = z.object({ inventoryItemId: z.string(), notes: z.string().optional() });

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body);
  try {
    const request = await createRequestFromRecommendation(req.user!.orgId, input.inventoryItemId, req.user!.id, input.notes);
    res.status(201).json({ request });
  } catch (err) {
    if (err instanceof ProcurementError) throw new AppError(400, err.message);
    throw err;
  }
});

const statusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED", "ORDERED", "IN_TRANSIT", "RECEIVED"]),
  receivedQty: z.number().positive().optional(),
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = statusSchema.parse(req.body);
  try {
    const request = await updateRequestStatus(req.user!.orgId, req.params.id, input.status, req.user!.id, input.receivedQty);
    res.json({ request });
  } catch (err) {
    if (err instanceof ProcurementError) throw new AppError(400, err.message);
    throw err;
  }
});
