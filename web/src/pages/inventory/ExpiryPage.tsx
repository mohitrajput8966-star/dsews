import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocations } from "@/lib/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface ExpiryRow {
  batchId: string;
  genericName: string;
  strength: string;
  batchNumber: string;
  locationName: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  bucket: string;
  inventoryValueAtRisk: number;
}

const BUCKET_VARIANT: Record<string, "danger" | "warning" | "info" | "outline"> = {
  EXPIRED: "danger",
  WITHIN_30_DAYS: "danger",
  WITHIN_60_DAYS: "warning",
  WITHIN_90_DAYS: "info",
  BEYOND: "outline",
};

export default function ExpiryPage() {
  const { data: locations } = useLocations();
  const [locationId, setLocationId] = useState("");

  const { data } = useQuery({
    queryKey: ["expiry", locationId],
    queryFn: async () => (await api.get("/analytics/expiry", { params: { locationId: locationId || undefined } })).data,
  });

  const rows: ExpiryRow[] = (data?.rows ?? []).filter((r: ExpiryRow) => r.bucket !== "BEYOND");
  const totalValueAtRisk = rows.reduce((sum: number, r: ExpiryRow) => sum + r.inventoryValueAtRisk, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Expiry Management</h1>

      <Card>
        <CardHeader><CardTitle>Inventory Value at Risk</CardTitle></CardHeader>
        <CardContent><p className="text-2xl font-semibold text-risk-high">{formatCurrency(totalValueAtRisk)}</p></CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="max-w-xs">
            <option value="">All Locations</option>
            {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Drug</th><th>Batch</th><th>Location</th><th>Qty</th><th>Expiry Date</th><th>Days</th><th>Value at Risk</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.batchId} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{r.genericName} {r.strength}</td>
                  <td className="text-muted-foreground">{r.batchNumber}</td>
                  <td className="text-muted-foreground">{r.locationName}</td>
                  <td>{r.quantity}</td>
                  <td className="text-muted-foreground">{formatDate(r.expiryDate)}</td>
                  <td>{r.daysUntilExpiry}</td>
                  <td>{formatCurrency(r.inventoryValueAtRisk)}</td>
                  <td><Badge variant={BUCKET_VARIANT[r.bucket]}>{r.bucket.replace(/_/g, " ")}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No near-expiry or expired batches.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
