import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const location = useLocation();

  useEffect(() => {
    if (token && !user) {
      fetchMe();
    } else if (!token) {
      useAuthStore.setState({ isHydrating: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isHydrating || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading your session...</div>
    );
  }

  if (organization && !organization.orgSetupComplete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
