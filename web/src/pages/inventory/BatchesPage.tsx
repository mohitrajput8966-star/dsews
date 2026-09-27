import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocations } from "@/lib/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  expiryDate: string;
  drug: { genericName: string; strength: string };
  location: { name: string };
}

export default function BatchesPage() {
  const { data: locations } = useLocations();
  const [locationId, setLocationId] = useState("");

  const { data } = useQuery({
    queryKey: ["batches", locationId],
    queryFn: async () => (await api.get("/inventory/batches", { params: { locationId: locationId || undefined } })).data,
  });

  const batches: Batch[] = data?.batches ?? [];
  const today = Date.now();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Batches</h1>
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
                <th className="pb-2">Drug</th><th>Batch #</th><th>Location</th><th>Quantity</th><th>Value</th><th>Expiry</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const expired = new Date(b.expiryDate).getTime() < today;
                return (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium">{b.drug.genericName} {b.drug.strength}</td>
                    <td className="text-muted-foreground">{b.batchNumber}</td>
                    <td className="text-muted-foreground">{b.location.name}</td>
                    <td>{b.quantity}</td>
                    <td>{formatCurrency(b.quantity * b.unitCost)}</td>
                    <td className="text-muted-foreground">{formatDate(b.expiryDate)}</td>
                    <td><Badge variant={expired ? "danger" : "success"}>{expired ? "Expired" : "Active"}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {batches.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No batches found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
