import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@dsews/shared";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "8h";

export interface AuthTokenPayload {
  userId: string;
  orgId: string;
  role: UserRole;
  locationId: string | null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
