import { Badge } from "@/components/ui/Badge";

const VARIANT: Record<string, "danger" | "warning" | "success" | "info" | "outline"> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "success",
};

export function RiskBadge({ level }: { level: string }) {
  return <Badge variant={VARIANT[level] ?? "outline"}>{level}</Badge>;
}
