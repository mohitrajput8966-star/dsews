import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Alert {
  id: string;
  type: string;
  riskLevel: string | null;
  message: string;
  reasonSummary: string;
  recommendedAction: string | null;
  isRead: boolean;
  createdAt: string;
  drug: { genericName: string; strength: string };
  location: { name: string };
}

const TYPE_VARIANT: Record<string, "danger" | "warning" | "info" | "outline"> = {
  CRITICAL: "danger", HIGH_RISK: "warning", REORDER: "info", OVERSTOCK: "outline", EXPIRY: "warning", EXPIRED: "danger", SUPPLIER_DELAY: "outline",
};

export default function RiskAlertsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", type, unreadOnly],
    queryFn: async () => (await api.get("/alerts", { params: { type: type || undefined, isRead: unreadOnly ? "false" : undefined } })).data,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/alerts/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts-unread-count"] });
    },
  });
  const markAllMutation = useMutation({
    mutationFn: async () => api.post("/alerts/mark-all-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts-unread-count"] });
    },
  });

  const alerts: Alert[] = data?.alerts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Risk Alerts</h1>
        <Button size="sm" variant="outline" onClick={() => markAllMutation.mutate()}>Mark All Read</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-5">
          <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-xs">
            <option value="">All Types</option>
            {["CRITICAL", "HIGH_RISK", "REORDER", "OVERSTOCK", "EXPIRY", "EXPIRED", "SUPPLIER_DELAY"].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="h-4 w-4" />
            Unread only
          </label>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.id} className={a.isRead ? "opacity-70" : ""}>
              <CardContent className="flex items-start justify-between gap-4 pt-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={TYPE_VARIANT[a.type] ?? "outline"}>{a.type.replace(/_/g, " ")}</Badge>
                    {!a.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{a.reasonSummary}</p>
                  {a.recommendedAction && <p className="text-xs text-primary">{a.recommendedAction}</p>}
                  <p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                </div>
                {!a.isRead && (
                  <Button size="sm" variant="outline" onClick={() => markReadMutation.mutate(a.id)}>Mark Read</Button>
                )}
              </CardContent>
            </Card>
          ))}
          {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts match your filters.</p>}
        </div>
      )}
    </div>
  );
}
