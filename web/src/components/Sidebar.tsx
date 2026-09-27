import { NavLink } from "react-router-dom";
import { NAV_STRUCTURE, roleHasPermission, type NavGroup, type NavLeaf } from "@dsews/shared";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/cn";

function isGroup(item: NavLeaf | NavGroup): item is NavGroup {
  return "items" in item;
}

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "block rounded-md px-3 py-2 text-sm transition-colors",
      isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
    );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <p className="text-sm font-semibold text-primary">DSEWS</p>
        <p className="text-xs text-muted-foreground">Early Warning System</p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV_STRUCTURE.map((item, idx) => {
          if (!role) return null;
          if (isGroup(item)) {
            const visibleItems = item.items.filter((leaf) => roleHasPermission(role, leaf.permission));
            if (visibleItems.length === 0) return null;
            return (
              <div key={idx}>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <div className="space-y-0.5">
                  {visibleItems.map((leaf) => (
                    <NavLink key={leaf.path} to={leaf.path} className={linkClass}>
                      {leaf.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }
          if (!roleHasPermission(role, item.permission)) return null;
          return (
            <NavLink key={item.path} to={item.path} className={linkClass}>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-border px-3 py-3">
        <NavLink to="/profile" className={linkClass}>
          Profile
        </NavLink>
      </div>
    </aside>
  );
}
