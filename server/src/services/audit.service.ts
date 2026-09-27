import { prisma } from "../lib/prisma";

export interface AuditEntry {
  orgId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

const SENSITIVE_KEYS = new Set(["password", "passwordHash", "token", "secret"]);

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_KEYS.has(key)) delete clone[key];
  }
  return clone;
}

/** Writes one audit trail entry. Never persists passwords/secrets (redacted above). */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      orgId: entry.orgId,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changesJson: JSON.stringify({ old: redact(entry.oldValue), new: redact(entry.newValue) }),
    },
  });
}
