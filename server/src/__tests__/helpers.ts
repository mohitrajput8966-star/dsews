import http from "http";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../app";
import { hashPassword } from "../utils/auth";

export const prisma = new PrismaClient();

export async function startTestServer() {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, baseUrl: `http://localhost:${port}/api` };
}

export async function stopTestServer(server: http.Server) {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

interface SeededOrg {
  orgId: string;
  adminEmail: string;
  scmEmail: string;
  pharmacyEmail: string;
  password: string;
  locationId: string;
}

/** Minimal fixture: one org, one location, 3 users of different roles — fast, isolated from the demo seed. */
export async function seedTestOrg(suffix: string): Promise<SeededOrg> {
  const password = "TestPass123";
  const passwordHash = await hashPassword(password);

  const org = await prisma.organization.create({
    data: {
      name: `Test Hospital ${suffix}`,
      orgType: "HOSPITAL",
      isDemo: true,
      orgSetupComplete: true,
    },
  });
  await prisma.orgSettings.create({
    data: { orgId: org.id, expiryWindowsDays: "[30,60,90]" },
  });
  const location = await prisma.location.create({
    data: { orgId: org.id, name: `Main Store ${suffix}`, type: "CENTRAL_WAREHOUSE" },
  });

  // Lowercased to match how the real controllers store/query email (findUnique on email.toLowerCase()).
  const adminEmail = `admin-${suffix}@test.example`.toLowerCase();
  const scmEmail = `scm-${suffix}@test.example`.toLowerCase();
  const pharmacyEmail = `pharmacy-${suffix}@test.example`.toLowerCase();

  await prisma.user.create({
    data: { orgId: org.id, email: adminEmail, passwordHash, name: `Admin ${suffix}`, role: "ADMIN" },
  });
  await prisma.user.create({
    data: { orgId: org.id, email: scmEmail, passwordHash, name: `SCM ${suffix}`, role: "SUPPLY_CHAIN_MANAGER" },
  });
  await prisma.user.create({
    data: {
      orgId: org.id,
      email: pharmacyEmail,
      passwordHash,
      name: `Pharmacy ${suffix}`,
      role: "PHARMACY_MANAGER",
      locationId: location.id,
    },
  });

  return { orgId: org.id, adminEmail, scmEmail, pharmacyEmail, password, locationId: location.id };
}

/** eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture, response shape asserted per-test */
export async function login(baseUrl: string, email: string, password: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

/** Typed `.json()` helper so test assertions don't fight `unknown` from the DOM fetch types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function json(res: Response): Promise<any> {
  return res.json();
}
