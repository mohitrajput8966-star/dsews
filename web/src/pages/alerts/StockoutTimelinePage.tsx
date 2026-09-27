import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RiskBadge } from "@/components/RiskBadge";

export default function StockoutTimelinePage() {
  const { data: dash } = useQuery({ queryKey: ["dashboard", {}], queryFn: async () => (await api.get("/dashboard")).data });
  const { data: risk } = useQuery({
    queryKey: ["risk", "", "CRITICAL,HIGH,MEDIUM"],
    queryFn: async () => (await api.get("/risk/inventory", { params: { riskLevel: "CRITICAL,HIGH,MEDIUM" } })).data,
  });

  const items = (risk?.items ?? []).filter((i: any) => i.assessment.projectedStockoutDate);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Stock-out Timeline</h1>

      <Card>
        <CardHeader><CardTitle>Projected Stock-outs by Window</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dash?.charts.stockoutTimeline ?? []}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--risk-high))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upcoming Stock-outs</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {items
            .sort((a: any, b: any) => new Date(a.assessment.projectedStockoutDate).getTime() - new Date(b.assessment.projectedStockoutDate).getTime())
            .map((i: any) => (
              <div key={i.inventoryItemId} className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
                <span>{i.genericName} {i.strength} <span className="text-muted-foreground">@ {i.locationName}</span></span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatDate(i.assessment.projectedStockoutDate)}</span>
                  <RiskBadge level={i.assessment.riskLevel} />
                </span>
              </div>
            ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No projected stock-outs.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
