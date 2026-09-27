import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function ConsumptionPage() {
  const { data } = useQuery({ queryKey: ["dashboard", {}], queryFn: async () => (await api.get("/dashboard")).data });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Consumption</h1>
      <p className="text-sm text-muted-foreground">
        Organization-wide daily consumption across all drugs and locations, last 30 days. For per-drug historical
        consumption vs. forecast, see <Link to="/analytics/forecasting" className="text-primary hover:underline">Forecasting</Link>.
      </p>
      <Card>
        <CardHeader><CardTitle>Total Daily Consumption (units)</CardTitle><CardDescription>Sum across every drug and location</CardDescription></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data?.charts.consumptionTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="quantity" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
