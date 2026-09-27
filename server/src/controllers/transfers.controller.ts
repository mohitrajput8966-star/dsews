import { Request, Response } from "express";
import { z } from "zod";
import { recommendTransfers, createTransferRequest, listTransfers, completeTransfer, cancelTransfer } from "../services/transfer.service";
import { asyncHandler, AppError } from "../utils/errors";

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const recommendations = await recommendTransfers(req.user!.orgId);
  res.json({ recommendations });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const transfers = await listTransfers(req.user!.orgId, status);
  res.json({ transfers });
});

const createSchema = z.object({
  drugId: z.string(),
  fromLocationId: z.string(),
  toLocationId: z.string(),
  quantity: z.number().positive(),
  reason: z.string().optional(),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body);
  const transfer = await createTransferRequest(req.user!.orgId, input, req.user!.id);
  res.status(201).json({ transfer });
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  try {
    const transfer = await completeTransfer(req.user!.orgId, req.params.id, req.user!.id);
    res.json({ transfer });
  } catch (err) {
    throw new AppError(400, (err as Error).message);
  }
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  try {
    const transfer = await cancelTransfer(req.user!.orgId, req.params.id, req.user!.id);
    res.json({ transfer });
  } catch (err) {
    throw new AppError(400, (err as Error).message);
  }
});
