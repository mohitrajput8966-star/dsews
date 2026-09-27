import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { prisma } from "../lib/prisma";
import type { UserRole } from "@dsews/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string;
  locationId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the bearer JWT AND re-reads the user from the database on every
 * request (rather than trusting the token's stale claims), so a deactivated
 * account or role change takes effect immediately instead of waiting out the
 * token's expiry.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Account is inactive or no longer exists." });
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      orgId: user.orgId,
      locationId: user.locationId,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}
