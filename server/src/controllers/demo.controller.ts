import { Request, Response } from "express";
import { resetDemoData, DemoResetError } from "../services/demo.service";
import { asyncHandler, AppError } from "../utils/errors";

export const resetDemo = asyncHandler(async (req: Request, res: Response) => {
  try {
    const summary = await resetDemoData(req.user!.orgId, req.user!.id);
    res.json({
      message: "Demo data has been reset. Please log in again with the demo credentials.",
      drugCount: summary.drugCount,
      inventoryCount: summary.inventoryCount,
      riskSummary: summary.riskSummary,
    });
  } catch (err) {
    if (err instanceof DemoResetError) throw new AppError(400, err.message);
    throw err;
  }
});
