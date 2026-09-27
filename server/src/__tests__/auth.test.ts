import { beforeAll, afterAll, describe, it, expect } from "vitest";
import http from "http";
import { prisma, startTestServer, stopTestServer, seedTestOrg, login, json } from "./helpers";

let server: http.Server;
let baseUrl: string;
let orgA: Awaited<ReturnType<typeof seedTestOrg>>;
let orgB: Awaited<ReturnType<typeof seedTestOrg>>;

beforeAll(async () => {
  const started = await startTestServer();
  server = started.server;
  baseUrl = started.baseUrl;
  orgA = await seedTestOrg("A");
  orgB = await seedTestOrg("B");
});

afterAll(async () => {
  await stopTestServer(server);
  await prisma.$disconnect();
});

describe("1. Login", () => {
  it("succeeds with correct credentials and returns a token + user + organization", async () => {
    const { status, body } = await login(baseUrl, orgA.adminEmail, orgA.password);
    expect(status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(orgA.adminEmail);
    expect(body.user.role).toBe("ADMIN");
    expect(body.organization.id).toBe(orgA.orgId);
  });
});

describe("9. Invalid login", () => {
  it("rejects an unknown email", async () => {
    const { status, body } = await login(baseUrl, "nobody@test.example", "whatever");
    expect(status).toBe(401);
    expect(body.error).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    const { status } = await login(baseUrl, orgA.adminEmail, "WrongPassword1");
    expect(status).toBe(401);
  });

  it("never reveals whether the email or the password was wrong (identical message)", async () => {
    const wrongEmail = await login(baseUrl, "nobody@test.example", "whatever");
    const wrongPassword = await login(baseUrl, orgA.adminEmail, "WrongPassword1");
    expect(wrongEmail.body.error).toBe(wrongPassword.body.error);
  });
});

describe("3. Protected routes", () => {
  it("rejects requests with no token", async () => {
    const res = await fetch(`${baseUrl}/users`);
    expect(res.status).toBe(401);
  });

  it("rejects requests with a malformed token", async () => {
    const res = await fetch(`${baseUrl}/users`, { headers: { Authorization: "Bearer not-a-real-token" } });
    expect(res.status).toBe(401);
  });
});

describe("10. Session persistence / current-user detection", () => {
  it("GET /auth/me returns the authenticated user for a valid token", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.scmEmail, orgA.password);
    const res = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${loginBody.token}` } });
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.user.email).toBe(orgA.scmEmail);
    expect(body.organization.id).toBe(orgA.orgId);
  });
});

describe("2. Logout", () => {
  it("succeeds for an authenticated user and writes an audit log entry", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.pharmacyEmail, orgA.password);
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    expect(res.status).toBe(200);

    const logs = await prisma.auditLog.findMany({ where: { action: "USER_LOGGED_OUT", orgId: orgA.orgId } });
    expect(logs.length).toBeGreaterThan(0);
  });
});

describe("4. Role permissions / role-based authorization", () => {
  it("blocks a non-admin (PHARMACY_MANAGER) from the admin-only users list", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.pharmacyEmail, orgA.password);
    const res = await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${loginBody.token}` } });
    expect(res.status).toBe(403);
  });

  it("allows ADMIN to access the users list", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.adminEmail, orgA.password);
    const res = await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${loginBody.token}` } });
    expect(res.status).toBe(200);
  });
});

describe("6. Location permissions", () => {
  it("allows any authenticated user to LIST locations", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.scmEmail, orgA.password);
    const res = await fetch(`${baseUrl}/locations`, { headers: { Authorization: `Bearer ${loginBody.token}` } });
    expect(res.status).toBe(200);
  });

  it("blocks a non-admin (SUPPLY_CHAIN_MANAGER) from CREATING a location", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.scmEmail, orgA.password);
    const res = await fetch(`${baseUrl}/locations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${loginBody.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Rogue Location", type: "OT_STORE" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("7. Admin-only settings", () => {
  it("blocks a non-admin from updating organization settings", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.scmEmail, orgA.password);
    const res = await fetch(`${baseUrl}/organizations/current`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${loginBody.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hacked Name" }),
    });
    expect(res.status).toBe(403);
  });

  it("allows ADMIN to update organization settings", async () => {
    const { body: loginBody } = await login(baseUrl, orgA.adminEmail, orgA.password);
    const res = await fetch(`${baseUrl}/organizations/current`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${loginBody.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ primaryContactPhone: "+1-555-0199" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("5. Organization data isolation", () => {
  it("org B's admin cannot see org A's locations", async () => {
    const { body: loginBody } = await login(baseUrl, orgB.adminEmail, orgB.password);
    const res = await fetch(`${baseUrl}/locations`, { headers: { Authorization: `Bearer ${loginBody.token}` } });
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.locations.every((l: { orgId: string }) => l.orgId === orgB.orgId)).toBe(true);
    expect(body.locations.some((l: { orgId: string }) => l.orgId === orgA.orgId)).toBe(false);
  });

  it("org B's admin cannot see org A's users", async () => {
    const { body: loginBody } = await login(baseUrl, orgB.adminEmail, orgB.password);
    const res = await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${loginBody.token}` } });
    const body = await json(res);
    const emails: string[] = body.users.map((u: { email: string }) => u.email);
    expect(emails).not.toContain(orgA.adminEmail);
  });

  it("org B's admin cannot patch a location belonging to org A", async () => {
    const { body: loginBody } = await login(baseUrl, orgB.adminEmail, orgB.password);
    const res = await fetch(`${baseUrl}/locations/${orgA.locationId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${loginBody.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    expect(res.status).toBe(404);
    const stillActive = await prisma.location.findUnique({ where: { id: orgA.locationId } });
    expect(stillActive?.isActive).toBe(true);
  });
});

describe("8. User deactivation", () => {
  it("deactivated users cannot log in", async () => {
    const { body: adminLogin } = await login(baseUrl, orgA.adminEmail, orgA.password);
    const usersRes = await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${adminLogin.token}` } });
    const users = (await json(usersRes)).users as { id: string; email: string }[];
    const scmUser = users.find((u) => u.email === orgA.scmEmail)!;

    const deactivateRes = await fetch(`${baseUrl}/users/${scmUser.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminLogin.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    expect(deactivateRes.status).toBe(200);

    const { status } = await login(baseUrl, orgA.scmEmail, orgA.password);
    expect(status).toBe(401);
  });

  it("an admin cannot deactivate their own account", async () => {
    const { body: adminLogin } = await login(baseUrl, orgA.adminEmail, orgA.password);
    const meRes = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${adminLogin.token}` } });
    const me = (await json(meRes)).user;

    const res = await fetch(`${baseUrl}/users/${me.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminLogin.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    expect(res.status).toBe(400);
  });

  it("an admin cannot change their own role", async () => {
    const { body: adminLogin } = await login(baseUrl, orgA.adminEmail, orgA.password);
    const meRes = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${adminLogin.token}` } });
    const me = (await json(meRes)).user;

    const res = await fetch(`${baseUrl}/users/${me.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminLogin.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "EXECUTIVE" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("Organization registration + onboarding", () => {
  it("creates a new organization with orgSetupComplete=false, then completing onboarding flips it to true", async () => {
    const registerRes = await fetch(`${baseUrl}/auth/register-organization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgName: "New Test Org",
        orgType: "PHARMACY_CHAIN",
        primaryContactName: "Jamie Test",
        primaryContactEmail: "jamie@neworg.test.example",
        adminName: "Jamie Test",
        adminEmail: "jamie-admin@neworg.test.example",
        adminPassword: "NewOrgPass123",
      }),
    });
    const registerBody = await json(registerRes);
    expect(registerRes.status).toBe(201);
    expect(registerBody.organization.orgSetupComplete).toBe(false);

    const onboardRes = await fetch(`${baseUrl}/organizations/current/complete-onboarding`, {
      method: "POST",
      headers: { Authorization: `Bearer ${registerBody.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [{ name: "First Store", type: "MAIN_PHARMACY" }],
        policy: { defaultLeadTimeDays: 7, serviceLevelZ: 1.65, reviewPeriodDays: 14, criticalDaysThreshold: 4, overstockCoverageMultiplier: 3 },
      }),
    });
    const onboardBody = await json(onboardRes);
    expect(onboardRes.status).toBe(200);
    expect(onboardBody.organization.orgSetupComplete).toBe(true);
  });
});
