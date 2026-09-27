import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance, reused across the app (and safe under
// tsx's hot-reload in dev, which would otherwise spawn a new client per reload).
declare global {
  // eslint-disable-next-line no-var
  var __dsewsPrisma: PrismaClient | undefined;
}

export const prisma = global.__dsewsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__dsewsPrisma = prisma;
}
