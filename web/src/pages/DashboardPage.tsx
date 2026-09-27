import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useLocations } from "@/lib/hooks";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { RiskBadge } from "@/components/RiskBadge";

const RISK_COLORS: Record<string, string> = { CRITICAL: "#dc2626", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#16a34a" };
const CATEGORIES = [
  "Antibiotics", "Analgesics", "Cardiovascular", "Diabetes", "Gastrointestinal", "Anticoagulants", "Anesthetics",
  "Respiratory", "Emergency", "IV Fluids", "Vitamins", "Antihistamines", "Steroids", "Dermatological", "Ophthalmic",
  "CNS", "Anti-TB", "Miscellaneous",
];

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone?: "danger" | "warning" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-2xl ${tone === "danger" ? "text-risk-critical" : tone === "warning" ? "text-risk-high" : ""}`}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const { data: locations } = useLocations();

  const [filters, setFilters] = useState({ locationId: "", therapeuticCategory: "", riskLevel: "", abcCategory: "", vedCategory: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: async () => (await api.get("/dashboard", { params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })).data,
  });

  function update<K extends keyof typeof filters>(key: K, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {user?.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">
            {organization?.name} · {user ? user.role.replace(/_/g, " ") : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-5 sm:grid-cols-3 lg:grid-cols-5">
          <Select value={filters.locationId} onChange={(e) => update("locationId", e.target.value)}>
            <option value="">All Locations</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
          <Select value={filters.therapeuticCategory} onChange={(e) => update("therapeuticCategory", e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={filters.riskLevel} onChange={(e) => update("riskLevel", e.target.value)}>
            <option value="">All Risk Levels</option>
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select value={filters.abcCategory} onChange={(e) => update("abcCategory", e.target.value)}>
            <option value="">All ABC</option>
            {["A", "B", "C"].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={filters.vedCategory} onChange={(e) => update("vedCategory", e.target.value)}>
            <option value="">All VED</option>
            {["VITAL", "ESSENTIAL", "DESIRABLE"].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        <KpiCard label="Total Medicines" value={data.kpis.totalMedicines} />
        <KpiCard label="Total Inventory Value" value={formatCurrency(data.kpis.totalInventoryValue, organization?.currency)} />
        <KpiCard label="Critical Risk" value={data.kpis.criticalRisk} tone="danger" />
        <KpiCard label="High Risk" value={data.kpis.highRisk} tone="warning" />
        <KpiCard label="Below Reorder Point" value={data.kpis.belowReorderPoint} />
        <KpiCard label="Projected Stock-outs (30d)" value={data.kpis.projectedStockouts30d} />
        <KpiCard label="Near Expiry" value={data.kpis.nearExpiry} />
        <KpiCard label="Open Procurement Requests" value={data.kpis.openProcurementRequests} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Supply Chain Actions</CardTitle>
          <CardDescription>Generated from current risk, expiry, and procurement data.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.todaysActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No urgent actions right now — inventory coverage looks healthy.</p>
          ) : (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {data.todaysActions.map((a: string, i: number) => <li key={i}>{a}</li>)}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.charts.riskDistribution} dataKey="count" nameKey="level" innerRadius={50} outerRadius={90}>
                  {data.charts.riskDistribution.map((d: { level: string }) => <Cell key={d.level} fill={RISK_COLORS[d.level]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 10 Shortage-Risk Medicines</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              {data.charts.top10AtRisk.map((i: { drugId: string; name: string; locationName: string; daysOfStock: number | null; riskLevel: string }) => (
                <div key={i.drugId + i.locationName} className="flex items-center justify-between border-b border-border pb-1 last:border-0">
                  <span>{i.name} <span className="text-muted-foreground">@ {i.locationName}</span></span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{i.daysOfStock ?? "—"}d</span>
                    <RiskBadge level={i.riskLevel} />
                  </span>
                </div>
              ))}
              {data.charts.top10AtRisk.length === 0 && <p className="text-muted-foreground">No critical/high risk medicines currently.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Consumption Trend (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.charts.consumptionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="quantity" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inventory Value by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.charts.inventoryValueByCategory.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Projected Stock-out Timeline</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.charts.stockoutTimeline}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--risk-high))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ABC / VED Distribution</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.charts.abcDistribution}>
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.charts.vedDistribution}>
                <XAxis dataKey="category" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
