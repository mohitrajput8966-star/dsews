import { Request, Response } from "express";
import { z } from "zod";
import { REPORT_KEYS, getReportRows, getReportTitle, type ReportKey } from "../services/reports.service";
import { toCsv } from "../utils/csv";
import { asyncHandler, AppError } from "../utils/errors";

const paramsSchema = z.object({ key: z.enum(REPORT_KEYS) });
const querySchema = z.object({
  locationId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const { key } = paramsSchema.parse(req.params);
  const { format, ...filters } = querySchema.parse(req.query);

  const rows = await getReportRows(key as ReportKey, req.user!.orgId, filters);
  const title = await getReportTitle(key as ReportKey, req.user!.orgId);

  if (format === "csv") {
    const csv = toCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${key}-report.csv"`);
    return res.send(csv);
  }

  res.json({ title, generatedAt: new Date().toISOString(), rows });
});
