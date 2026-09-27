import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { useLocations } from "@/lib/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RiskBadge } from "@/components/RiskBadge";
import { usePermission } from "@/lib/use-permission";

interface RiskItem {
  inventoryItemId: string;
  drugId: string;
  genericName: string;
  strength: string;
  locationName: string;
  currentStock: number;
  leadTimeDays: number;
  supplierName: string | null;
  assessment: {
    riskLevel: string;
    riskScore: number;
    averageDailyConsumption: number;
    daysOfStock: number | null;
    safetyStock: number;
    reorderPoint: number;
    projectedStockoutDate: string | null;
    triggeredRule: string;
    isOverstocked: boolean;
    factors: { name: string; contribution: number; weightPct: number; explanation: string }[];
  };
  procurement: { recommendedOrderQuantity: number; estimatedCost: number };
  reasonSummary: string;
  recommendedAction: string;
}

export default function DrugRiskPage({ onlyLevels }: { onlyLevels?: string[] }) {
  const queryClient = useQueryClient();
  const canCreateRequest = usePermission("procurement:purchaseRequests") || usePermission("procurement:recommendations");
  const { data: locations } = useLocations();
  const [locationId, setLocationId] = useState("");
  const [riskLevel, setRiskLevel] = useState(onlyLevels?.join(",") ?? "");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["risk", locationId, riskLevel],
    queryFn: async () => (await api.get("/risk/inventory", { params: { locationId: locationId || undefined, riskLevel: riskLevel || undefined } })).data,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (inventoryItemId: string) => api.post("/procurement/requests", { inventoryItemId }),
    onSuccess: () => {
      setMessage("Purchase request created.");
      queryClient.invalidateQueries({ queryKey: ["risk"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
    onError: (err) => setMessage(getApiErrorMessage(err)),
  });

  const items: RiskItem[] = data?.items ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Drug Risk</h1>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-5">
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="max-w-xs">
            <option value="">All Locations</option>
            {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          {!onlyLevels && (
            <Select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="max-w-xs">
              <option value="">All Risk Levels</option>
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          )}
          {data?.summary && (
            <span className="text-xs text-muted-foreground">
              {data.summary.totalItems} item(s) — {data.summary.CRITICAL} critical, {data.summary.HIGH} high, {data.summary.MEDIUM} medium, {data.summary.overstocked} overstocked
            </span>
          )}
        </CardContent>
      </Card>

      {message && <p className="text-sm text-primary">{message}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <Card key={i.inventoryItemId}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.genericName} {i.strength} <span className="text-muted-foreground">@ {i.locationName}</span></p>
                    <p className="text-xs text-muted-foreground">{i.reasonSummary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={i.assessment.riskLevel} />
                    {i.assessment.isOverstocked && <span className="text-xs text-risk-overstock">OVERSTOCK</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
                  <div><p className="text-muted-foreground">Current Stock</p><p className="font-medium">{i.currentStock}</p></div>
                  <div><p className="text-muted-foreground">ADC</p><p className="font-medium">{i.assessment.averageDailyConsumption}</p></div>
                  <div><p className="text-muted-foreground">Days Remaining</p><p className="font-medium">{i.assessment.daysOfStock ?? "—"}</p></div>
                  <div><p className="text-muted-foreground">Lead Time</p><p className="font-medium">{i.leadTimeDays}d</p></div>
                  <div><p className="text-muted-foreground">Safety Stock</p><p className="font-medium">{i.assessment.safetyStock}</p></div>
                  <div><p className="text-muted-foreground">Reorder Point</p><p className="font-medium">{i.assessment.reorderPoint}</p></div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Projected stock-out: <span className="font-medium text-foreground">{formatDate(i.assessment.projectedStockoutDate)}</span>
                  </span>
                  <button className="text-primary hover:underline" onClick={() => setExpanded(expanded === i.inventoryItemId ? null : i.inventoryItemId)}>
                    {expanded === i.inventoryItemId ? "Hide factor breakdown" : "Why this risk level?"}
                  </button>
                </div>

                {expanded === i.inventoryItemId && (
                  <div className="rounded-md bg-muted p-3 text-xs">
                    {i.assessment.factors.map((f) => (
                      <div key={f.name} className="flex justify-between py-0.5">
                        <span>{f.name} ({f.weightPct}%)</span>
                        <span className="text-muted-foreground">{f.contribution} — {f.explanation}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span>{i.recommendedAction}</span>
                  {canCreateRequest && i.procurement.recommendedOrderQuantity > 0 && (
                    <Button size="sm" onClick={() => createRequestMutation.mutate(i.inventoryItemId)} disabled={createRequestMutation.isPending}>
                      Create Purchase Request ({i.procurement.recommendedOrderQuantity} units, {formatCurrency(i.procurement.estimatedCost)})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No medicines match your filters.</p>}
        </div>
      )}
    </div>
  );
}
