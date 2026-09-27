import { roleHasPermission, type PermissionKey } from "@dsews/shared";
import { useAuthStore } from "@/store/auth.store";

export function usePermission(key: PermissionKey): boolean {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return false;
  return roleHasPermission(role, key);
}
