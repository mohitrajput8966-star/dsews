import type { PermissionKey } from "@dsews/shared";
import { usePermission } from "@/lib/use-permission";

export function RequirePermission({ permission, children }: { permission: PermissionKey; children: React.ReactNode }) {
  const allowed = usePermission(permission);
  if (!allowed) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        You do not have permission to view this page. Contact your organization administrator if you believe this is an error.
      </div>
    );
  }
  return <>{children}</>;
}
