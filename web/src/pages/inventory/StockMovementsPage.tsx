import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocations } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  occurredAt: string;
  referenceType: string | null;
  drug: { genericName: string; strength: string };
  location: { name: string };
}

const TYPE_VARIANT: Record<string, "success" | "warning" | "info" | "outline"> = {
  RECEIPT: "success",
  ISSUE: "outline",
  TRANSFER_IN: "info",
  TRANSFER_OUT: "warning",
  ADJUSTMENT: "outline",
  EXPIRY_WRITE_OFF: "warning",
};

export default function StockMovementsPage() {
  const { data: locations } = useLocations();
  const [locationId, setLocationId] = useState("");

  const { data } = useQuery({
    queryKey: ["stock-movements", locationId],
    queryFn: async () => (await api.get("/inventory/movements", { params: { locationId: locationId || undefined } })).data,
  });

  const rows: Movement[] = data?.movements ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Stock Movements</h1>
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
                <th className="pb-2">Drug</th><th>Location</th><th>Type</th><th>Quantity</th><th>Reference</th><th>When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{m.drug.genericName} {m.drug.strength}</td>
                  <td className="text-muted-foreground">{m.location.name}</td>
                  <td><Badge variant={TYPE_VARIANT[m.type] ?? "outline"}>{m.type.replace(/_/g, " ")}</Badge></td>
                  <td>{m.quantity}</td>
                  <td className="text-muted-foreground">{m.referenceType ?? "—"}</td>
                  <td className="text-muted-foreground">{formatDateTime(m.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No stock movements recorded yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
