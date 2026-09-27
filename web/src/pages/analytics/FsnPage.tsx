import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

const LABELS: Record<string, string> = { F: "Fast-moving", S: "Slow-moving", N: "Non-moving" };
const VARIANT: Record<string, "success" | "warning" | "outline"> = { F: "success", S: "warning", N: "outline" };

export default function FsnPage() {
  const { data } = useQuery({ queryKey: ["fsn"], queryFn: async () => (await api.get("/analytics/fsn")).data });
  const [filter, setFilter] = useState("");

  const rows: { drugId: string; genericName: string; strength: string; therapeuticCategory: string; fsnCategory: string }[] = data?.rows ?? [];
  const filtered = filter ? rows.filter((r) => r.fsnCategory === filter) : rows;
  const counts = { F: rows.filter((r) => r.fsnCategory === "F").length, S: rows.filter((r) => r.fsnCategory === "S").length, N: rows.filter((r) => r.fsnCategory === "N").length };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">FSN Analysis</h1>
      <div className="grid grid-cols-3 gap-4">
        {(["F", "S", "N"] as const).map((k) => (
          <Card key={k}>
            <CardContent className="pt-5">
              <p className="text-2xl font-semibold">{counts[k]}</p>
              <p className="text-sm text-muted-foreground">{LABELS[k]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-5">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs">
            <option value="">All</option>
            <option value="F">Fast-moving</option>
            <option value="S">Slow-moving</option>
            <option value="N">Non-moving</option>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto pt-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Drug</th><th>Category</th><th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.drugId} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{r.genericName} {r.strength}</td>
                  <td className="text-muted-foreground">{r.therapeuticCategory}</td>
                  <td><Badge variant={VARIANT[r.fsnCategory]}>{LABELS[r.fsnCategory]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
