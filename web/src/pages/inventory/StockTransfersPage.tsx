import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Recommendation {
  drugId: string;
  genericName: string;
  strength: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  toRiskLevel: string;
  toDaysOfStock: number | null;
  recommendedQuantity: number;
  note: string;
}

interface Transfer {
  id: string;
  quantity: number;
  status: string;
  reason: string | null;
  createdAt: string;
  drug: { genericName: string; strength: string };
  fromLocation: { name: string };
  toLocation: { name: string };
  requestedBy: { name: string };
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "outline"> = { REQUESTED: "warning", COMPLETED: "success", CANCELLED: "outline" };

export default function StockTransfersPage() {
  const queryClient = useQueryClient();

  const { data: recData } = useQuery({
    queryKey: ["transfer-recommendations"],
    queryFn: async () => (await api.get("/transfers/recommendations")).data,
  });
  const { data: listData } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => (await api.get("/transfers")).data,
  });

  const createMutation = useMutation({
    mutationFn: async (r: Recommendation) =>
      api.post("/transfers", {
        drugId: r.drugId,
        fromLocationId: r.fromLocationId,
        toLocationId: r.toLocationId,
        quantity: r.recommendedQuantity,
        reason: r.note,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transfers"] }),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/transfers/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["risk"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/transfers/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transfers"] }),
  });

  const recommendations: Recommendation[] = recData?.recommendations ?? [];
  const transfers: Transfer[] = listData?.transfers ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Stock Transfers</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Internal Transfers</CardTitle>
          <CardDescription>Locations with excess stock that could cover another location's shortage before external procurement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.map((r, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{r.genericName} {r.strength}</p>
                <p className="text-xs text-muted-foreground">
                  {r.fromLocationName} → {r.toLocationName} ({r.toRiskLevel}, {r.toDaysOfStock ?? "?"}d left) — {r.recommendedQuantity} units
                </p>
              </div>
              <Button size="sm" onClick={() => createMutation.mutate(r)} disabled={createMutation.isPending}>Create Transfer Request</Button>
            </div>
          ))}
          {recommendations.length === 0 && <p className="text-sm text-muted-foreground">No internal transfer opportunities right now.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transfer Requests</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Drug</th><th>From</th><th>To</th><th>Qty</th><th>Status</th><th>Requested</th><th></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{t.drug.genericName} {t.drug.strength}</td>
                  <td className="text-muted-foreground">{t.fromLocation.name}</td>
                  <td className="text-muted-foreground">{t.toLocation.name}</td>
                  <td>{t.quantity}</td>
                  <td><Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge></td>
                  <td className="text-muted-foreground">{formatDateTime(t.createdAt)}</td>
                  <td className="text-right">
                    {t.status === "REQUESTED" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => completeMutation.mutate(t.id)}>Mark Completed</Button>
                        <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(t.id)}>Cancel</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transfers.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No transfer requests yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
