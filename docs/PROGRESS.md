# DSEWS Build Log

Running phase-by-phase log. Each entry: what was built, files touched, commands to verify, env vars, and what was tested.

---

## Phase 1 — Architecture, Database Schema, Folder Structure ✅

**Implemented**
- npm-workspaces monorepo: `packages/shared`, `server`, `web`.
- `packages/shared`: domain types (`types.ts`), configurable policy defaults (`constants.ts`), and the full **stock-out risk & forecasting calculation engine** (`calculations.ts`) — ADC, days-of-stock, lead-time demand, safety stock (Z × σ × √LT), reorder point, projected stock-out date, a transparent weighted risk score with per-factor explanations, rule-based CRITICAL/HIGH/MEDIUM/LOW classification, procurement order-up-to recommendation, 3 forecasting methods (moving average, weighted moving average, exponential smoothing), ABC/FSN classification, expiry bucketing.
- `server`: Express + TypeScript skeleton (`src/app.ts`, `src/index.ts`) with a working `/api/health` route; full Prisma schema (`prisma/schema.prisma`) covering Organization, OrgSettings, Location, User, Supplier, Drug, InventoryItem, Batch, ConsumptionHistory, PurchaseRequest, StockMovement, Alert, ForecastResult, AuditLog — 15 tables with proper relations/indexes.
- `web`: Vite + React + TypeScript + Tailwind scaffold with the DSEWS color system (light + dark mode CSS variables, risk-level color tokens) and a placeholder landing shell.
- Root `.gitignore`, `.env.example` files for server and web.

**Files created:** see repo tree — `package.json` (root, server, web, packages/shared), `packages/shared/src/{types,constants,calculations,index}.ts`, `server/prisma/schema.prisma`, `server/prisma/seed.ts` (placeholder), `server/src/{app,index}.ts`, `server/tsconfig.json`, `server/.env.example`, `web/{index.html,vite.config.ts,tailwind.config.ts,postcss.config.js,tsconfig.json,.env.example}`, `web/src/{main.tsx,App.tsx,index.css}`.

**Commands run to verify (all passed):**
```bash
npm install                                   # 522 packages, workspaces linked
npx prisma generate                           # (in server/) — client generated OK
npx prisma migrate dev --name init            # (in server/) — SQLite schema created, all 15 tables
npx tsc --noEmit                              # packages/shared, server, web — all clean, zero type errors
npm run build --workspace=web                 # Vite production build succeeded, Tailwind CSS compiled (7.18kB)
npx tsx src/index.ts  &&  curl localhost:4000/api/health   # -> {"status":"ok",...}
```

**Env vars needed:** `server/.env` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`) and `web/.env` (`VITE_API_URL`) — both have `.env.example` templates, `server/.env` already created locally from the example for testing.

**Not yet built (upcoming phases):** real seed data, auth endpoints, inventory CRUD, dashboard UI, alerts, reports, simulator, landing/sales pages — per the 14-phase roadmap.

---

## Phase 2 — Database Layer, Migrations & Seed/Demo Data ✅

**Implemented**
- `server/prisma/seedData/suppliers.ts` — 8 fictional suppliers spanning reliable to unreliable (avgLeadTimeDays 5–14, onTimeDeliveryPct 60–97%, reliabilityScore 48–94) for the Supplier Risk module.
- `server/prisma/seedData/drugs.ts` — 83-drug catalog (16 therapeutic categories) as compact tuples, each carrying an *intended* risk scenario/FSN/volatility/trend/expiry tag.
- `server/prisma/seed.ts` — full orchestration:
  - Deterministic PRNG (mulberry32, seeded per drug code) so `db:reset` always reproduces the same demo dataset.
  - Generates 120 days of daily consumption history per drug (base ADC by unit/FSN, Gaussian noise scaled by a volatility tag, a linear trend, and sparsity for slow-movers/zero for non-movers).
  - Derives `currentStock`/`minStockLevel`/`reorderLevel`/`maxStockLevel` **backwards** from the target days-of-stock coverage for each drug's scenario, using the actual trailing-30-day ADC/σ computed from the generated history and the exact same formulas (`leadTimeDemand`, `safetyStock`, `reorderPoint`) the app uses at runtime — not arbitrary numbers.
  - Creates 2 `InventoryItem` rows per drug (its point-of-use pharmacy/store + the Central Medical Store warehouse), with 3 drugs deliberately short at both (systemic shortage, no internal transfer possible) and the rest abundant at the warehouse (internal-transfer opportunity, section 24).
  - Creates `Batch` records with engineered expiry dates (2 expired, 3 within 30 days, 2 within 60, 3 within 90 — 10 total near-expiry/expired cases); the 2 "expired" drugs get a split old/fresh batch pair.
  - **Self-verifying**: re-runs the real `calculateRiskAssessment()` engine against every seeded drug and prints a distribution + mismatch report before finishing. Caught and fixed two real bugs this way (see below).
- `server/src/utils/auth.ts`, `server/src/lib/prisma.ts` — password hashing/JWT signing utilities and a shared Prisma client singleton, needed to seed the 7 demo user accounts and reused by Phase 3 auth.

**Bugs found and fixed via the seed's own sanity check (not just assumed correct):**
1. The sanity-check risk assessment call passed the full 120-day history array but a 30-day `analysisPeriodDays` divisor, inflating computed ADC ~4x and collapsing nearly every drug toward CRITICAL. Fixed by passing only the matching trailing-30-day slice — and documented the (records, periodDays) pairing rule in-code for Phase 5 to follow.
2. `targetDaysOfStock()` originally targeted lead-time multiples only, ignoring that the classifier's MEDIUM/LOW boundary is "current stock vs. reorder point" and reorder point grows with realized consumption volatility. Rewrote it to target relative to the *actual computed* reorder point (`ropDays`), which fixed all remaining boundary misclassifications. Also bumped one supplier's lead time from 4→6 days, since 4 days made a HIGH classification mathematically impossible against a 4-day critical-days threshold.
- Final seed run: **0 mismatches** — CRITICAL 10, HIGH 11, MEDIUM 16, LOW 39 (incl. 6 non-moving), OVERSTOCK flag 7. Exactly the intended distribution.

**Verified working (commands run):**
```bash
npx tsc --noEmit                         # server, shared — clean
npm run db:reset                         # drop -> migrate -> auto-seed, full workflow, reproducible
npx tsx prisma/seed.ts                   # re-run standalone — same distribution every time
node -e "... bcrypt.compare('Demo@123', hash)"   # demo login password verified against stored hash
# ad-hoc integrity query (server/verify_seed.ts, scratch — since removed):
#   5 locations, 7 users (all roles), 8 suppliers, 83 drugs, 166 inventory rows
#   (every drug at exactly 2 locations), 168 batches, 9,240 consumption rows,
#   expiry buckets expired=2/<=30d=3/31-60d=2/61-90d=3, Total Inventory Value ~$93.3K
```

**Note on `@dsews/shared` resolution (fixed during this phase):** importing the shared calculation engine from `server/src/utils/auth.ts` surfaced a TS6059 rootDir violation (server's tsconfig required all compiled files under `server/src`, but shared's package.json pointed `main`/`types` at raw `.ts` source). Fixed by pointing `packages/shared/package.json` at `dist/index.js`/`dist/index.d.ts` and removing the manual path-alias override in `server/tsconfig.json`, so plain Node can resolve the package in production too. **Consequence: `packages/shared` must be built (`npm run build --workspace=packages/shared`) before running the server** — the root `dev`, `build`, and `db:setup` scripts now do this automatically.

**Intentionally empty tables** (populated by later phases from real computations, never hardcoded): `Alert` (Phase 9's alert engine), `PurchaseRequest` / `StockMovement` (Phase 8's procurement workflow), `ForecastResult` (Phase 7, computed on demand). `historicalStockoutCount90d` is passed as `0` to the risk engine during seeding since no stock-out history exists yet on a freshly seeded database — Phase 5's live risk-engine service will compute it from real `StockMovement`/`Alert` history going forward.

---

## Phase 4 — Authentication + Organization Setup ✅

**Implemented**

*Database:* migration `phase4_auth_org` adds `Organization.primaryContactPhone/timezone/orgSetupComplete`, `Location.contactPerson/isActive/updatedAt`, `User.phone`. Backfilled cleanly against the existing seeded data (5 rows) with a patched `DEFAULT CURRENT_TIMESTAMP` for the new non-null `updatedAt` column.

*Backend (`server/src/`):* `middleware/auth.middleware.ts` (JWT verify + fresh DB re-read of the user on every request, so a deactivated account or role change takes effect immediately rather than waiting for token expiry), `middleware/rbac.middleware.ts` (`requirePermission`/`requireRole`, backed by a single shared source of truth), `services/audit.service.ts` (writes `AuditLog` rows, redacts password/secret keys), `utils/errors.ts` (typed `AppError` + Zod-aware error handler — no stack traces or raw exceptions ever reach the client), and controllers/routes for `auth` (login, logout, me, register-organization), `organizations` (get/update current, complete-onboarding), `locations` (list/create/update — deactivate-only, never delete), `users` (list/create/update, plus self-service `/users/me` profile edit that explicitly excludes `role`).

*Shared (`packages/shared/src/permissions.ts`):* `ROLE_PERMISSIONS` (all 7 roles per the spec's exact permission table) and `NAV_STRUCTURE` (the section-11 sidebar tree, each leaf tagged with the permission key that gates it) — one file both the API's route guards and the web app's sidebar/route guards import, so a permission can never drift between "what's shown" and "what's enforced".

*Frontend (`web/src/`):* `store/auth.store.ts` (Zustand + persist; a "Remember session" toggle switches the persisted storage between `localStorage` and `sessionStorage` via a custom storage adapter), `lib/api.ts` (axios instance, auth header injection, 401 → auto session-clear), `components/ProtectedRoute.tsx` (redirects unauthenticated → `/login`, redirects an org with `orgSetupComplete=false` → `/onboarding`, shows a loading state while the session hydrates), `components/RequirePermission.tsx` (frontend guard for settings pages), `components/Sidebar.tsx` + `Header.tsx` (role-filtered nav, org name + role + a `"<Org Name> — DEMO DATA"` badge impossible to mistake for a real deployment), a small hand-rolled UI kit (`components/ui/`), and pages: `LoginPage` (branded, "Use Demo Account" picker that fills but never auto-submits, Demo Mode banner), `SignupPage` + `onboarding/OnboardingWizard` (org+admin registration → locations → inventory policy → "Your organization is ready."), `DashboardPage` (real org/location data, not a static shell), `ProfilePage`, and `settings/{Organization,Locations,Users}SettingsPage`.

**Multi-tenant isolation approach:** since Phase 1 deliberately chose SQLite/Prisma over Supabase (see that phase's note), there is no database-level RLS to configure. Isolation is enforced at the application layer instead: every query is scoped to `req.user.orgId`, which comes **only** from the verified JWT — never from a client-supplied body/query param — so one organization's token cannot be used to address another organization's rows by ID (verified: a cross-org `PATCH /locations/:id` with another org's real location ID returns 404, not 403, so the resource's existence isn't even leaked).

**Automated tests (`server/src/__tests__/`, `npm test` → 21/21 passing):** a dedicated Vitest config points `DATABASE_URL` at a throwaway `prisma/test.db`, wiped and re-migrated via `prisma migrate reset --force` in `globalSetup` (not a manual file-delete — an earlier attempt hit a Windows SQLite file-lock race that silently left stale rows from the previous run in place). Fixtures seed two isolated organizations directly via Prisma so tests never depend on the demo dataset. Coverage: login (success/invalid/deactivated-user), logout + audit trail, protected routes (401 with no/malformed token), role permissions (403 non-admin / 200 admin on the same endpoint), location permissions (list allowed for all, create admin-only), admin-only org settings, cross-org isolation (locations, users, and a direct patch-by-ID probe), self-role-change and self-deactivation blocks, and the full register → onboard → `orgSetupComplete` flip flow.

**Bugs found and fixed (by the tests, not assumed away):**
1. Test fixtures inserted emails with an uppercase suffix (e.g. `admin-A@test.example`) while the real login controller correctly queries `email.toLowerCase()` (standard, matches how `registerOrganization`/`createUser` store emails) — a fixture bug, not a product bug, but it took an isolated repro script to confirm the app code was fine and the test data wasn't.
2. `ProtectedRoute` showed "Loading your session..." forever after a fresh login: `isHydrating` was only ever cleared inside `fetchMe()`, but a successful `login()` populates the user directly without calling `fetchMe()`. Fixed by clearing `isHydrating` in `login`/`setSession` too.
3. Rollup couldn't statically analyze the compiled CJS `export *` re-exports in `packages/shared/dist` for the web production build (`"roleHasPermission" is not exported by ...index.js"`) — fixed by aliasing `@dsews/shared` to its TypeScript source for the Vite build only (server still consumes the compiled `dist`, since Node needs real JS).

**Manual verification performed (browser + curl), beyond the automated suite:** logged in via the demo-account picker as Supply Chain Manager and confirmed the sidebar hid every `Settings:*` item; logged in as Admin and created a real location and a real audit-logged deactivation through the UI; navigated a Pharmacy Manager session directly to `/settings/users` by URL and got the "you do not have permission" fallback (not a broken page or a leaked API error); registered a brand-new second organization end-to-end and confirmed its admin token saw zero locations until onboarding, then exactly the one it created — never MedCare's five.

**Verified working (commands):**
```bash
npx prisma migrate dev --name phase4_auth_org   # applied cleanly against existing seeded data
npm run db:reset                                # full reset still reproduces the same 83-drug risk distribution
npm test                                        # 21/21 passing
npx tsc --noEmit                                # shared, server, web — all clean
npm run build                                   # shared + server + web production builds all succeed
```

**Env vars:** none new — reuses `JWT_SECRET`/`JWT_EXPIRES_IN` from Phase 1.

**Not yet built:** the actual drug/inventory/dashboard data endpoints (Phase 4 in the original 14-phase roadmap, i.e. what comes next) — this phase's `DashboardPage` intentionally shows only org/location context, not KPIs, since there's no inventory API yet to back real numbers.

---

## Phase 5 — Drug Shortage Risk Engine ✅

**Implemented**

The 9 calculation functions requested (ADC, days-of-stock, lead-time demand, safety stock, reorder point, projected stock-out date, risk score, risk classification, recommended order quantity) already existed as pure functions in `packages/shared/src/calculations.ts` since Phase 1 — Phase 5's job was to (a) unit-test them properly, and (b) build the service layer that feeds them real database rows instead of the seed script's in-memory arrays.

- `server/src/services/risk-engine.service.ts` (new): `assessInventoryItem()` and `assessOrganizationInventory()` — for a given `InventoryItem`, pulls its trailing-30-day `ConsumptionHistory`, the org's `OrgSettings` (mapped to the shared `OrgPolicy` type), and a real count of past CRITICAL alerts for that drug/location (0 today, since no alert history exists yet — computed honestly, not hardcoded), then calls the exact same `calculateRiskAssessment`/`calculateProcurementRecommendation` functions the unit tests exercise. Builds a plain-English `reasonSummary` + `recommendedAction` from the assessment's own `triggeredRule` and factor breakdown — never a separate, possibly-inconsistent explanation.
- `server/src/controllers/risk.controller.ts` + `server/src/routes/risk.routes.ts`: `GET /api/risk/inventory` (org-scoped, optional `locationId`/`riskLevel` filters, returns every item sorted CRITICAL→LOW then by soonest stock-out, plus a summary count) and `GET /api/risk/inventory/:inventoryItemId` (single-item full detail). Gated by a new `requireAnyPermission()` guard (`inventory:drugRisk` OR `alerts:risk` OR `executiveDashboard`) since Supply Chain Managers, Procurement Officers, and Executives all legitimately need this data even though only some have the narrower `inventory:drugRisk` permission.
- `packages/shared/src/__tests__/calculations.test.ts` (new): 28 unit tests. One block per formula (ADC, days-of-stock, lead-time demand, safety stock, reorder point, projected stock-out date, recommended order quantity), plus ABC/FSN/expiry smoke tests, plus **5 realistic end-to-end scenarios modeled directly on the assignment's own worked examples** — Ceftriaxone (120 stock/25 ADC/8-day lead time), Enoxaparin (6 days of stock vs. 8-day lead time), Pantoprazole (reorder-point breach), a stable fast-mover, and an overstocked bulk IV fluid — plus a zero-stock edge case and a test proving the risk score is a transparent sum of its documented factors, not a black box.

**Exact formulas and where they live (`packages/shared/src/calculations.ts`):**

| # | Formula | Function | Line |
|---|---|---|---|
| 1 | ADC = total consumed ÷ days in period | `averageDailyConsumption()` | L30 |
| 2 | Days of Stock = current stock ÷ ADC (null if ADC=0) | `daysOfStock()` | L74 |
| 3 | Lead Time Demand = ADC × lead time (days) | `leadTimeDemand()` | L56 |
| 4 | Safety Stock = Z × σ(daily demand) × √(lead time) | `safetyStock()` | L64 |
| 5 | Reorder Point = Lead Time Demand + Safety Stock | `reorderPoint()` | L69 |
| 6 | Projected Stock-out Date = today + ⌊days of stock⌋ | `projectedStockoutDate()` | L80 |
| 7 | Risk Score = Σ(weighted factor contributions), 5 factors (urgency 35%, reorder proximity 20%, volatility 15%, criticality 20%, historical stock-outs 10%) | `calculateRiskAssessment()` | L104–211 |
| 8 | Risk Classification = rule cascade (CRITICAL → HIGH → MEDIUM → LOW) on stock/days/reorder-point vs. lead time & threshold | `classifyRiskLevel()` | L213–249 |
| 9 | Recommended Qty = ⌈max(0, ADC×(lead time+review period)+safety stock − current stock)⌉, floored at min order qty, capped at max stock | `calculateProcurementRecommendation()` | L273–295 |

**Tested against the live seeded database (not just the seed script's own dry run):** booted the API, logged in, and called `GET /api/risk/inventory` for real —

```
{ totalItems: 166, CRITICAL: 10, HIGH: 11, MEDIUM: 16, LOW: 129, overstocked: 7 }
```

CRITICAL/HIGH/MEDIUM/overstock counts match the seed's own sanity check exactly (10/11/16/7) — computed this time by a live HTTP request reading `InventoryItem`/`ConsumptionHistory`/`OrgSettings` through Prisma, not reused in-memory data. (LOW is higher here — 129 vs. the seed script's 39 — because this list includes the 83 warehouse-location rows too, which by design have no modeled consumption history and so always read as LOW/no-urgency; see Phase 2's note on that scoping choice.) Pulled full explanations for the top 3 CRITICAL drugs (Meropenem: 1 day of stock against a 10-day lead time; Insulin Regular: 1.2 days against 9; Epinephrine: 1.3 days against 6) and one HIGH drug (Propofol) with its complete 5-factor score breakdown — every number traceable to a real `InventoryItem`/`ConsumptionHistory` row. Also verified RBAC on the new endpoints: Warehouse Manager → 403, Procurement Officer → 200, no token → 401.

**Verified working (commands):**
```bash
npm run test   # 28 (shared) + 21 (server) = 49/49 passing
npx tsc --noEmit   # shared, server — clean
npm run build      # all 3 workspaces build
```

**Not yet built:** no UI page surfaces this yet (Drug Risk Table and Drug Detail Page are later phases per the roadmap) — this phase was scoped to the engine and its API, as requested.

---

## Phases 6–14 — Dashboard through Deployment Readiness ✅

Built as one continuous pass at the user's request (minimal per-phase narration, maximum working functionality). Full detail lives in [PROJECT_ARCHITECTURE.md](../PROJECT_ARCHITECTURE.md); this entry is a pointer + what was verified.

**Backend added:** `analytics.service.ts` (dashboard KPIs/charts, ABC/VED/FSN, expiry, supplier performance), `forecast.service.ts`, `alert.service.ts` (live-synced Alert Center, 7 alert types), `procurement.service.ts` (full workflow incl. real inventory update + StockMovement on receipt), `transfer.service.ts` (cross-location recommendation + request/complete/cancel), `reports.service.ts` + `utils/csv.ts` (6 reports, CSV export), `inventory.service.ts` (CRUD + validated CSV import), `demo.service.ts`/`demo-seed.service.ts` (scoped Reset Demo Data — deletes only the caller's own org, never other tenants). New `StockTransfer` table + migration. Seed logic refactored out of `prisma/seed.ts` into `src/services/demo-seed.service.ts` so both the CLI and the in-app reset endpoint share one generator (relocated `seedData/` under `server/src/data/` to satisfy the build's rootDir).

**Frontend added:** full Dashboard rewrite (KPIs, 6 charts, filters, Today's Actions), Inventory/Drug Risk/Batches/Expiry/Stock Movements/Stock Transfers pages, Analytics (Consumption/Forecasting/ABC-VED/FSN), Alerts (Risk Alerts/Critical Medicines/Stock-out Timeline, header badge), Procurement (Recommendations/Purchase Requests/Purchase Orders/Suppliers), Reports (6 types, CSV export, print layout), Scenario Simulator (pure client-side, reuses `@dsews/shared` formulas directly), public Landing + Product Overview pages, Reset Demo Data button (Settings → Organization). Added `scenarioSimulator` permission and a `Stock Transfers` nav leaf to the shared permission map — every route in the nav now resolves to a real page (no dead links).

**Verified end-to-end (curl + browser, not assumed):**
- Live `/api/dashboard` KPIs/charts match hand-computed expectations from the seeded data.
- Full functional chain proven live: Meropenem at 9 units (CRITICAL) → purchase request created (282 units, real recommendation) → Approved → Ordered → Received → stock became 291 units → risk recalculated to LOW — all through real HTTP calls, not simulated.
- Alert generation matches the risk engine exactly (10 CRITICAL + 11 HIGH_RISK + 16 REORDER + 7 OVERSTOCK + expiry alerts = live counts, zero hardcoding).
- Stock transfer recommended, created, and completed — both locations' `InventoryItem.currentStock` updated correctly.
- CSV import: 1 valid + 1 intentionally-broken row → 1 imported, 1 rejected with exact per-field reasons.
- Reset Demo Data: old session invalidated, fresh login works, identical risk distribution reproduced.
- RBAC spot-checked across roles (Warehouse Manager 403 on risk endpoints, Procurement Officer 200, etc.).
- `npm test` → 49/49 passing (28 shared + 21 server) after all additions. `npm run build` → clean across all 3 workspaces. `tsc --noEmit` → clean.
- Code audit: no `TODO`/`FIXME`/placeholder/mock-data markers, no dead buttons or `href="#"` links, no secrets in the frontend bundle.

**Known limitations:** `ForecastResult` table exists but forecasts are computed on-demand rather than cached (fine at this data scale). Email notifications are architecturally straightforward to add (the alert data model already has everything needed) but were intentionally left out per the instruction not to make email required for the core app. Frontend bundle is a single ~230KB gzipped chunk (Vite warns above 500KB pre-gzip) — acceptable at this scope; code-splitting would be the next step for a larger deployment.

---
