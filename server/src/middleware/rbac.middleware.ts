import { Request, Response, NextFunction } from "express";
import { roleHasPermission, type PermissionKey, type UserRole } from "@dsews/shared";

/** Requires req.user (see requireAuth) to hold the given permission per the shared ROLE_PERMISSIONS map. */
export function requirePermission(key: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    if (!roleHasPermission(req.user.role, key)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

/** Passes if the caller holds ANY of the given permissions (e.g. risk data is useful to more than one role). */
export function requireAnyPermission(...keys: PermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    if (!keys.some((key) => roleHasPermission(req.user!.role, key))) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

/** Coarser guard for endpoints restricted to specific roles regardless of the permission map (e.g. ADMIN-only). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}
