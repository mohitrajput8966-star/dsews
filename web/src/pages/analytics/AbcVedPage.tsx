import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

const SEGMENTS = ["AV", "AE", "AD", "BV", "BE", "BD", "CV", "CE", "CD"];
const HIGH_PRIORITY = new Set(["AV", "AE", "BV"]);

export default function AbcVedPage() {
  const { data } = useQuery({ queryKey: ["abc-ved"], queryFn: async () => (await api.get("/analytics/abc-ved")).data });
  const matrix: Record<string, { drugId: string; genericName: string; strength: string }[]> = data?.matrix ?? {};

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">ABC-VED Matrix</h1>
      <p className="text-sm text-muted-foreground">
        A = high consumption value, B = medium, C = low (Pareto, by annualized consumption value). V = Vital, E =
        Essential, D = Desirable. AV/AE/BV combinations deserve the tightest inventory control.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SEGMENTS.map((seg) => (
          <Card key={seg} className={HIGH_PRIORITY.has(seg) ? "border-risk-critical/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>{seg}</span>
                <span className="text-sm font-normal text-muted-foreground">{matrix[seg]?.length ?? 0}</span>
              </CardTitle>
              {HIGH_PRIORITY.has(seg) && <CardDescription className="text-risk-critical">High-priority segment</CardDescription>}
            </CardHeader>
            <CardContent className="max-h-56 space-y-1 overflow-y-auto text-sm">
              {(matrix[seg] ?? []).map((d) => (
                <p key={d.drugId} className="text-muted-foreground">{d.genericName} {d.strength}</p>
              ))}
              {(!matrix[seg] || matrix[seg].length === 0) && <p className="text-xs text-muted-foreground">None</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
