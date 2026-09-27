// Demand forecasting — a thin adapter over the shared buildForecastSummary()
// formula. No forecasting math lives here; this only fetches ConsumptionHistory
// and hands it to the shared engine, exactly like risk-engine.service does.
import { buildForecastSummary, type ForecastMethod, type ConsumptionRecord } from "@dsews/shared";
import { prisma } from "../lib/prisma";

const HISTORY_WINDOW_DAYS = 120; // matches the seed's own consumption history length

export async function getForecast(drugId: string, locationId: string, orgId: string, method: ForecastMethod) {
  const drug = await prisma.drug.findFirst({ where: { id: drugId, orgId } });
  if (!drug) return null;
  const location = await prisma.location.findFirst({ where: { id: locationId, orgId } });
  if (!location) return null;

  const since = new Date();
  since.setDate(since.getDate() - HISTORY_WINDOW_DAYS);
  const rows = await prisma.consumptionHistory.findMany({
    where: { drugId, locationId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
  const records: ConsumptionRecord[] = rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), quantity: r.quantityConsumed }));

  const summary = buildForecastSummary(records, method, 14);

  return {
    drugId,
    genericName: drug.genericName,
    strength: drug.strength,
    locationId,
    locationName: location.name,
    ...summary,
  };
}
