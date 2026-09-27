import { useMemo, useState } from "react";
import {
  leadTimeDemand,
  safetyStock,
  reorderPoint,
  daysOfStock,
  projectedStockoutDate,
  calculateProcurementRecommendation,
  DEFAULT_ORG_POLICY,
  type RiskLevel,
} from "@dsews/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RiskBadge } from "@/components/RiskBadge";

interface Inputs {
  currentStock: number;
  dailyConsumption: number;
  consumptionStdDev: number;
  leadTimeDays: number;
  incomingQty: number;
  serviceLevelZ: number;
}

const BASE: Inputs = { currentStock: 120, dailyConsumption: 25, consumptionStdDev: 5, leadTimeDays: 8, incomingQty: 0, serviceLevelZ: 1.65 };

const PRESETS: { label: string; apply: (i: Inputs) => Inputs }[] = [
  { label: "Demand +20%", apply: (i) => ({ ...i, dailyConsumption: Math.round(i.dailyConsumption * 1.2 * 100) / 100 }) },
  { label: "Demand -20%", apply: (i) => ({ ...i, dailyConsumption: Math.round(i.dailyConsumption * 0.8 * 100) / 100 }) },
  { label: "Lead Time +5 days", apply: (i) => ({ ...i, leadTimeDays: i.leadTimeDays + 5 }) },
  { label: "Supplier delivers 300 units", apply: (i) => ({ ...i, incomingQty: i.incomingQty + 300 }) },
];

function classify(currentStock: number, dos: number | null, rop: number, leadTimeDays: number): { level: RiskLevel; rule: string } {
  const critical = DEFAULT_ORG_POLICY.criticalDaysThreshold;
  if (currentStock <= 0 || (dos !== null && dos <= critical)) return { level: "CRITICAL", rule: `Stock covers ${dos ?? 0} day(s), at/below the ${critical}-day critical threshold.` };
  if (dos !== null && dos < leadTimeDays) return { level: "HIGH", rule: `Days of stock (${dos.toFixed(1)}) is less than the lead time (${leadTimeDays}d).` };
  if (currentStock <= rop || (dos !== null && dos <= leadTimeDays * 1.5)) return { level: "MEDIUM", rule: `Stock has reached the reorder point (${rop.toFixed(1)}).` };
  return { level: "LOW", rule: "Coverage is adequate relative to lead time and reorder point." };
}

export default function ScenarioSimulatorPage() {
  const [inputs, setInputs] = useState<Inputs>(BASE);

  function update<K extends keyof Inputs>(key: K, value: number) {
    setInputs((i) => ({ ...i, [key]: value }));
  }

  const result = useMemo(() => {
    const effectiveStock = inputs.currentStock + inputs.incomingQty;
    const ltDemand = leadTimeDemand(inputs.dailyConsumption, inputs.leadTimeDays);
    const ss = safetyStock(inputs.serviceLevelZ, inputs.consumptionStdDev, inputs.leadTimeDays);
    const rop = reorderPoint(ltDemand, ss);
    const dos = daysOfStock(effectiveStock, inputs.dailyConsumption);
    const stockoutDate = projectedStockoutDate(new Date(), dos);
    const { level, rule } = classify(effectiveStock, dos, rop, inputs.leadTimeDays);
    const procurement = calculateProcurementRecommendation({
      currentStock: effectiveStock,
      adc: inputs.dailyConsumption,
      leadTimeDays: inputs.leadTimeDays,
      reviewPeriodDays: DEFAULT_ORG_POLICY.reviewPeriodDays,
      safetyStockValue: ss,
      minOrderQuantity: DEFAULT_ORG_POLICY.minOrderQuantityDefault,
      maxStockLevel: 0,
      unitCost: 1,
      riskLevel: level,
    });
    return { effectiveStock, ltDemand, ss, rop, dos, stockoutDate, level, rule, recommendedQty: procurement.recommendedOrderQuantity };
  }, [inputs]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">What-If Scenario Simulator</h1>
      <p className="text-sm text-muted-foreground">
        Adjust the inputs below — this never touches real inventory. All calculations run the same formulas as the live
        risk engine, purely in your browser.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Current Stock</Label><Input type="number" value={inputs.currentStock} onChange={(e) => update("currentStock", Number(e.target.value))} /></div>
            <div><Label>Average Daily Consumption</Label><Input type="number" value={inputs.dailyConsumption} onChange={(e) => update("dailyConsumption", Number(e.target.value))} /></div>
            <div><Label>Consumption Std. Deviation</Label><Input type="number" value={inputs.consumptionStdDev} onChange={(e) => update("consumptionStdDev", Number(e.target.value))} /></div>
            <div><Label>Supplier Lead Time (days)</Label><Input type="number" value={inputs.leadTimeDays} onChange={(e) => update("leadTimeDays", Number(e.target.value))} /></div>
            <div><Label>Incoming Quantity (already ordered)</Label><Input type="number" value={inputs.incomingQty} onChange={(e) => update("incomingQty", Number(e.target.value))} /></div>
            <div><Label>Safety Stock Service Level (Z)</Label><Input type="number" step="0.01" value={inputs.serviceLevelZ} onChange={(e) => update("serviceLevelZ", Number(e.target.value))} /></div>

            <div className="flex flex-wrap gap-2 pt-2">
              {PRESETS.map((p) => (
                <Button key={p.label} size="sm" variant="outline" onClick={() => setInputs((i) => p.apply(i))}>{p.label}</Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setInputs(BASE)}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Result</CardTitle><CardDescription>Recomputed instantly from the inputs above.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <RiskBadge level={result.level} />
            </div>
            <p className="text-xs text-muted-foreground">{result.rule}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Effective Stock</p><p className="font-medium">{result.effectiveStock}</p></div>
              <div><p className="text-muted-foreground">Days of Stock</p><p className="font-medium">{result.dos !== null ? result.dos.toFixed(1) : "—"}</p></div>
              <div><p className="text-muted-foreground">Lead Time Demand</p><p className="font-medium">{result.ltDemand.toFixed(1)}</p></div>
              <div><p className="text-muted-foreground">Safety Stock</p><p className="font-medium">{result.ss.toFixed(1)}</p></div>
              <div><p className="text-muted-foreground">Reorder Point</p><p className="font-medium">{result.rop.toFixed(1)}</p></div>
              <div><p className="text-muted-foreground">Projected Stock-out</p><p className="font-medium">{result.stockoutDate ?? "—"}</p></div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-sm text-muted-foreground">Recommended Order Quantity</p>
              <p className="text-2xl font-semibold">{result.recommendedQty}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
