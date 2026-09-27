import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RiskBadge } from "@/components/RiskBadge";

interface PurchaseRequest {
  id: string;
  status: string;
  priority: string;
  requestedQty: number;
  estimatedCost: number;
  expectedDeliveryDate: string | null;
  createdAt: string;
  drug: { genericName: string; strength: string };
  location: { name: string };
  supplier: { name: string } | null;
  requestedBy: { name: string } | null;
  approvedBy: { name: string } | null;
}

const NEXT_STATUS: Record<string, { status: string; label: string; variant?: "default" | "destructive" }[]> = {
  PENDING_APPROVAL: [{ status: "APPROVED", label: "Approve" }, { status: "REJECTED", label: "Reject", variant: "destructive" }, { status: "CANCELLED", label: "Cancel" }],
  APPROVED: [{ status: "ORDERED", label: "Mark Ordered" }, { status: "CANCELLED", label: "Cancel" }],
  ORDERED: [{ status: "IN_TRANSIT", label: "Mark In Transit" }, { status: "RECEIVED", label: "Mark Received" }, { status: "CANCELLED", label: "Cancel" }],
  IN_TRANSIT: [{ status: "RECEIVED", label: "Mark Received" }, { status: "CANCELLED", label: "Cancel" }],
  RECEIVED: [],
  REJECTED: [],
  CANCELLED: [],
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "info" | "outline" | "danger"> = {
  PENDING_APPROVAL: "warning", APPROVED: "info", ORDERED: "info", IN_TRANSIT: "info", RECEIVED: "success", REJECTED: "danger", CANCELLED: "outline",
};

export default function PurchaseRequestsPage({ onlyStatuses }: { onlyStatuses?: string[] }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-requests", status],
    queryFn: async () => (await api.get("/procurement/requests", { params: { status: status || undefined } })).data,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => api.patch(`/procurement/requests/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["risk"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  let requests: PurchaseRequest[] = data?.requests ?? [];
  if (onlyStatuses) requests = requests.filter((r) => onlyStatuses.includes(r.status));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Purchase Requests</h1>

      {!onlyStatuses && (
        <Card>
          <CardContent className="pt-5">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
              <option value="">All Statuses</option>
              {Object.keys(NEXT_STATUS).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </Select>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Drug</th><th>Location</th><th>Supplier</th><th>Priority</th><th>Qty</th><th>Cost</th><th>Expected</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium">{r.drug.genericName} {r.drug.strength}</td>
                    <td className="text-muted-foreground">{r.location.name}</td>
                    <td className="text-muted-foreground">{r.supplier?.name ?? "—"}</td>
                    <td><RiskBadge level={r.priority} /></td>
                    <td>{r.requestedQty}</td>
                    <td>{formatCurrency(r.estimatedCost)}</td>
                    <td className="text-muted-foreground">{formatDate(r.expectedDeliveryDate)}</td>
                    <td><Badge variant={STATUS_VARIANT[r.status]}>{r.status.replace(/_/g, " ")}</Badge></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {NEXT_STATUS[r.status]?.map((n) => (
                          <Button
                            key={n.status}
                            size="sm"
                            variant={n.variant === "destructive" ? "destructive" : "outline"}
                            onClick={() => statusMutation.mutate({ id: r.id, newStatus: n.status })}
                            disabled={statusMutation.isPending}
                          >
                            {n.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No purchase requests found.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
