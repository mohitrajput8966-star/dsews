import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocations } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const REPORTS = [
  { key: "risk", label: "Drug Shortage Risk Report" },
  { key: "inventory", label: "Inventory Status Report" },
  { key: "expiry", label: "Expiry Risk Report" },
  { key: "procurement", label: "Procurement Report" },
  { key: "abc-ved", label: "ABC-VED Report" },
  { key: "supplier", label: "Supplier Performance Report" },
];

export default function ReportsPage() {
  const { data: locations } = useLocations();
  const [reportKey, setReportKey] = useState("risk");
  const [locationId, setLocationId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report", reportKey, locationId],
    queryFn: async () => (await api.get(`/reports/${reportKey}`, { params: { locationId: locationId || undefined } })).data,
  });

  async function downloadCsv() {
    const res = await api.get(`/reports/${reportKey}`, {
      params: { format: "csv", locationId: locationId || undefined },
      responseType: "blob",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(res.data as Blob);
    a.download = `${reportKey}-report.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const rows: Record<string, unknown>[] = data?.rows ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6 print:space-y-2">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print / Save as PDF</Button>
          <Button size="sm" onClick={downloadCsv}>Export CSV</Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="flex flex-wrap gap-3 pt-5">
          <Select value={reportKey} onChange={(e) => setReportKey(e.target.value)} className="max-w-xs">
            {REPORTS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="max-w-xs">
            <option value="">All Locations</option>
            {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{data?.title ?? REPORTS.find((r) => r.key === reportKey)?.label}</CardTitle>
          <CardDescription>Generated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : ""} · {rows.length} row(s)</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left uppercase text-muted-foreground">
                  {columns.map((c) => <th key={c} className="pb-2 pr-4">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {columns.map((c) => <td key={c} className="py-1.5 pr-4">{String(row[c] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No data for this report.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
