import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from "recharts";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";

const METHODS = [
  { value: "MOVING_AVERAGE", label: "Moving Average" },
  { value: "WEIGHTED_MOVING_AVERAGE", label: "Weighted Moving Average" },
  { value: "EXPONENTIAL_SMOOTHING", label: "Exponential Smoothing" },
];

export default function ForecastingPage() {
  const [selection, setSelection] = useState("");
  const [method, setMethod] = useState("EXPONENTIAL_SMOOTHING");

  const { data: invData } = useQuery({ queryKey: ["inventory-all"], queryFn: async () => (await api.get("/inventory")).data });
  const options = useMemo(() => {
    const items = invData?.items ?? [];
    return items.map((i: any) => ({
      key: `${i.drug.drugCode}::${i.location.name}::${i.drugId ?? i.id}`,
      drugId: i.drugId,
      locationId: i.locationId,
      label: `${i.drug.genericName} ${i.drug.strength} @ ${i.location.name}`,
    }));
  }, [invData]);

  const chosen = options.find((o: any) => o.key === selection) ?? options[0];

  const { data: forecast, isLoading } = useQuery({
    queryKey: ["forecast", chosen?.drugId, chosen?.locationId, method],
    queryFn: async () => (await api.get("/forecast", { params: { drugId: chosen.drugId, locationId: chosen.locationId, method } })).data,
    enabled: Boolean(chosen),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Demand Forecasting</h1>
      <p className="text-xs text-muted-foreground">
        Transparent statistical projection (moving average / weighted average / exponential smoothing) from real consumption
        history — not a clinically validated prediction.
      </p>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-5">
          <Select value={selection || chosen?.key || ""} onChange={(e) => setSelection(e.target.value)} className="max-w-sm">
            {options.map((o: any) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Select>
          <Select value={method} onChange={(e) => setMethod(e.target.value)} className="max-w-xs">
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </CardContent>
      </Card>

      {isLoading || !forecast ? (
        <p className="text-sm text-muted-foreground">Loading forecast…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardDescription>7-Day Avg</CardDescription><CardTitle className="text-xl">{forecast.avg7Day}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>30-Day Avg</CardDescription><CardTitle className="text-xl">{forecast.avg30Day}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>90-Day Avg</CardDescription><CardTitle className="text-xl">{forecast.avg90Day}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Trend</CardDescription><CardTitle className={`text-xl ${forecast.trendPctChange < 0 ? "text-risk-low" : forecast.trendPctChange > 0 ? "text-risk-high" : ""}`}>{forecast.trendPctChange > 0 ? "+" : ""}{forecast.trendPctChange}%</CardTitle></CardHeader></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historical Consumption vs. Forecast</CardTitle>
              <CardDescription>{forecast.genericName} {forecast.strength} @ {forecast.locationName} — forecasted daily demand: {forecast.forecastedDailyDemand}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecast.points}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(forecast.points.length / 10)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine x={forecast.points.find((p: any) => p.forecastConsumption !== null)?.date} stroke="hsl(var(--border))" />
                  <Line type="monotone" dataKey="historicalConsumption" name="Historical" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} connectNulls={false} />
                  <Line type="monotone" dataKey="forecastConsumption" name="Forecast" stroke="hsl(var(--risk-high))" strokeDasharray="5 5" dot={false} strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
