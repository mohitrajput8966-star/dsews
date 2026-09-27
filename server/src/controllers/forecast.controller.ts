import { Request, Response } from "express";
import { z } from "zod";
import { getForecast } from "../services/forecast.service";
import { asyncHandler, AppError } from "../utils/errors";

const querySchema = z.object({
  drugId: z.string(),
  locationId: z.string(),
  method: z.enum(["MOVING_AVERAGE", "WEIGHTED_MOVING_AVERAGE", "EXPONENTIAL_SMOOTHING"]).default("EXPONENTIAL_SMOOTHING"),
});

export const getForecastData = asyncHandler(async (req: Request, res: Response) => {
  const { drugId, locationId, method } = querySchema.parse(req.query);
  const result = await getForecast(drugId, locationId, req.user!.orgId, method);
  if (!result) throw new AppError(404, "Drug or location not found.");
  res.json(result);
});
