import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface SupplierRow {
  supplierId: string;
  name: string;
  avgLeadTimeDays: number;
  onTimeDeliveryPct: number;
  reliabilityScore: number;
  itemsSupplied: number;
  purchaseRequestCount: number;
  currentlyOverdue: number;
  received: number;
  riskCategory: string;
}

const VARIANT: Record<string, "success" | "warning" | "danger"> = { LOW: "success", MEDIUM: "warning", HIGH: "danger" };

export default function SuppliersPage() {
  const { data } = useQuery({ queryKey: ["supplier-performance"], queryFn: async () => (await api.get("/analytics/suppliers")).data });
  const rows: SupplierRow[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Suppliers</h1>
      <Card>
        <CardContent className="overflow-x-auto pt-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Supplier</th><th>Avg Lead Time</th><th>On-Time %</th><th>Reliability</th>
                <th>Items Supplied</th><th>Requests</th><th>Overdue</th><th>Received</th><th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.supplierId} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="text-muted-foreground">{s.avgLeadTimeDays}d</td>
                  <td className="text-muted-foreground">{s.onTimeDeliveryPct}%</td>
                  <td className="text-muted-foreground">{s.reliabilityScore}</td>
                  <td>{s.itemsSupplied}</td>
                  <td>{s.purchaseRequestCount}</td>
                  <td className={s.currentlyOverdue > 0 ? "text-risk-critical" : ""}>{s.currentlyOverdue}</td>
                  <td>{s.received}</td>
                  <td><Badge variant={VARIANT[s.riskCategory]}>{s.riskCategory}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
