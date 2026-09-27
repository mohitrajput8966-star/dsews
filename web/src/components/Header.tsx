import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { usePermission } from "@/lib/use-permission";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SUPPLY_CHAIN_MANAGER: "Supply Chain Manager",
  PHARMACY_MANAGER: "Pharmacy Manager",
  PROCUREMENT_OFFICER: "Procurement Officer",
  WAREHOUSE_MANAGER: "Warehouse Manager",
  HOSPITAL_ADMIN: "Hospital Administrator",
  EXECUTIVE: "Executive",
};

export function Header() {
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const canSeeAlerts = usePermission("alerts:risk") || usePermission("alerts:critical");

  const { data } = useQuery({
    queryKey: ["alerts-unread-count"],
    queryFn: async () => (await api.get("/alerts/unread-count")).data as { count: number },
    enabled: canSeeAlerts,
    refetchInterval: 60_000,
  });

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold leading-tight">{organization?.name}</p>
          <p className="text-xs text-muted-foreground leading-tight">{user ? ROLE_LABELS[user.role] ?? user.role : ""}</p>
        </div>
        {organization?.isDemo && (
          <Badge variant="info" title="This organization is running fictional demonstration data.">
            {organization.name} — DEMO DATA
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-4">
        {canSeeAlerts && (
          <Link to="/alerts/risk" className="relative text-sm text-muted-foreground hover:text-foreground">
            Alerts
            {Boolean(data?.count) && (
              <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                {data!.count > 99 ? "99+" : data!.count}
              </span>
            )}
          </Link>
        )}
        <span className="text-sm text-muted-foreground">{user?.name}</span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
