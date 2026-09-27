# DSEWS — Project Architecture

## 1. High-level architecture

```
┌─────────────┐      HTTPS/JSON       ┌──────────────┐      Prisma ORM      ┌────────────┐
│  web (SPA)  │  ───────────────────▶ │ server (API) │  ──────────────────▶ │  Database  │
│ React + Vite│  ◀───────────────────  │ Express + TS │  ◀──────────────────  │ SQLite/PG  │
└─────────────┘                       └──────────────┘                      └────────────┘
       │                                      │
       └──────────────┬───────────────────────┘
                       ▼
            packages/shared (pure TS)
      risk & forecast formulas, RBAC permission map,
      domain types — imported by BOTH sides so the
      math (and the nav/permission rules) can never drift.
```

Monorepo with npm workspaces: `packages/shared`, `server`, `web`. `packages/shared` is consumed by `server` via its compiled `dist/` (plain Node needs real JS) and by `web` via a source alias in `vite.config.ts` (Rollup can't statically tree-shake the compiled CJS `export *` pattern, and aliasing to source also means the browser bundle always reflects the latest formulas without a manual rebuild step).

## 2. Why this stack (and not Supabase)

The original brief suggested Supabase/Postgres. This project uses **Prisma + SQLite locally, Postgres in production** instead, because:
- Zero external accounts needed to run the demo — `npm install && npm run db:setup && npm run dev` just works.
- Prisma's schema is provider-agnostic: switching `provider = "sqlite"` to `"postgresql"` in `server/prisma/schema.prisma` plus a `DATABASE_URL` change is the entire migration (see [DEPLOYMENT.md](DEPLOYMENT.md)).
- Multi-tenant isolation is enforced at the application layer (every query scopes to `req.user.orgId` from the verified JWT) rather than via Postgres Row-Level Security, since SQLite has no RLS. This is documented and tested (`server/src/__tests__/auth.test.ts`, section 5).

## 3. Database schema

15 core tables (`server/prisma/schema.prisma`), all scoped by `orgId`:

| Table | Purpose |
|---|---|
| `Organization` / `OrgSettings` | Tenant + its configurable risk/procurement policy (Z-factor, critical-days threshold, review period, ABC/FSN cutoffs, expiry windows) |
| `Location` | Central warehouse + point-of-use pharmacies/stores |
| `User` | Login, role, assigned location |
| `Supplier` | Lead time, on-time %, reliability score |
| `Drug` | Master catalog (generic/brand name, strength, category, unit cost, criticality) |
| `InventoryItem` | Live stock position — one row per (drug, location) |
| `Batch` | Batch/expiry tracking, feeds Expiry Management |
| `ConsumptionHistory` | Daily consumption per (drug, location) — the risk/forecast engine's raw input |
| `PurchaseRequest` | Procurement workflow: PENDING_APPROVAL → APPROVED → ORDERED → IN_TRANSIT → RECEIVED (or REJECTED/CANCELLED) |
| `StockMovement` | Immutable ledger: RECEIPT, TRANSFER_IN/OUT, written automatically on receipt/transfer |
| `StockTransfer` | Internal transfer requests between locations (REQUESTED → COMPLETED/CANCELLED) |
| `Alert` | Early-warning alerts, synced live from current risk/expiry/procurement state |
| `ForecastResult` | Reserved for caching forecasts (currently computed on-demand) |
| `AuditLog` | Who did what, when — passwords/secrets redacted |

## 4. The calculation engine (`packages/shared/src/calculations.ts`)

Every formula is a small, independently unit-tested pure function (28 tests in `packages/shared/src/__tests__/calculations.test.ts`).

| Concept | Formula | Function |
|---|---|---|
| Average Daily Consumption | `total consumed ÷ days in period` | `averageDailyConsumption()` |
| Days of Stock | `current stock ÷ ADC` (null if ADC = 0) | `daysOfStock()` |
| Lead Time Demand | `ADC × lead time (days)` | `leadTimeDemand()` |
| Safety Stock | `Z × σ(daily demand) × √(lead time)` | `safetyStock()` |
| Reorder Point | `Lead Time Demand + Safety Stock` | `reorderPoint()` |
| Projected Stock-out Date | `today + ⌊days of stock⌋` | `projectedStockoutDate()` |
| Risk Score | weighted sum of 5 factors (urgency 35%, reorder proximity 20%, volatility 15%, criticality 20%, historical stock-outs 10%) | `calculateRiskAssessment()` |
| Risk Classification | rule cascade: stock=0 or days≤critical-threshold → CRITICAL; days<lead-time → HIGH; stock≤reorder-point or days≤1.5×lead-time → MEDIUM; else LOW | `classifyRiskLevel()` |
| Recommended Order Qty | `⌈max(0, ADC×(lead time+review period)+safety stock − current stock)⌉`, floored at min order qty, capped at max stock | `calculateProcurementRecommendation()` |
| Forecasting | 7/30/90-day moving average, weighted moving average, exponential smoothing | `buildForecastSummary()` |
| ABC | Pareto classification by cumulative annualized consumption value | `classifyABC()` |
| FSN | Fast/Slow/Non-moving by consumption recency + frequency | `classifyFSN()` |
| Expiry | days-until-expiry bucketing against configurable windows | `daysUntilExpiry()`, `expiryBucket()` |

`server/src/services/risk-engine.service.ts` is the only place these functions are called against real data — it fetches the trailing 30-day `ConsumptionHistory`, the org's `OrgSettings` (mapped to the shared `OrgPolicy` type), and a real count of past CRITICAL alerts, then hands them to the formulas above. Every other backend service (dashboard, alerts, procurement, transfers, reports) calls *this* service rather than recomputing risk itself.

## 5. Backend service layer (`server/src/services/`)

| Service | Responsibility |
|---|---|
| `risk-engine.service.ts` | Per-item and org-wide risk assessment (the one true source of risk data) |
| `forecast.service.ts` | Thin adapter over `buildForecastSummary()` |
| `analytics.service.ts` | Dashboard KPIs/charts, ABC/VED/FSN, expiry report, supplier performance |
| `alert.service.ts` | Syncs the `Alert` table with live risk/expiry/procurement state (creates/resolves, never spams duplicates) |
| `procurement.service.ts` | Purchase request lifecycle; on RECEIVED, updates `InventoryItem.currentStock` and writes a `StockMovement` in one transaction |
| `transfer.service.ts` | Cross-location excess/shortage matching; recording a completed transfer moves stock between two `InventoryItem` rows |
| `reports.service.ts` | Reuses the above services to assemble the 6 report types; CSV via `utils/csv.ts` |
| `inventory.service.ts` | Inventory CRUD, batch/movement listing, CSV import with per-row validation |
| `demo.service.ts` / `demo-seed.service.ts` | Scoped "Reset Demo Data" — deletes only the caller's own demo `Organization` row (cascades) and regenerates it; never touches other tenants |
| `audit.service.ts` | Writes `AuditLog` rows, redacts password/secret fields |

## 6. Frontend structure (`web/src/`)

- `store/auth.store.ts` — Zustand + persist, with a "Remember session" toggle switching between `localStorage`/`sessionStorage`.
- `lib/api.ts` — axios instance with auth header injection and 401 auto-logout.
- `components/{ProtectedRoute,RequirePermission,Sidebar,Header}.tsx` — route/permission guards and the role-filtered navigation shell (driven by `packages/shared`'s `NAV_STRUCTURE`/`ROLE_PERMISSIONS`, so a permission can never drift between "what's shown" and "what's enforced").
- `pages/` — one folder per nav section (`inventory/`, `analytics/`, `alerts/`, `procurement/`, `settings/`, `public/`), plus top-level `DashboardPage`, `ReportsPage`, `ScenarioSimulatorPage`.

## 7. Role-based access control

Single source of truth: `packages/shared/src/permissions.ts`. `ROLE_PERMISSIONS` maps each of the 7 roles (ADMIN, SUPPLY_CHAIN_MANAGER, PHARMACY_MANAGER, PROCUREMENT_OFFICER, WAREHOUSE_MANAGER, HOSPITAL_ADMIN, EXECUTIVE) to permission keys. The API's `requirePermission()`/`requireAnyPermission()` middleware and the web app's sidebar/route guards both import this one map.

## 8. Multi-tenant isolation

Every service function takes `orgId` explicitly, sourced only from the verified JWT (`req.user.orgId`) — never from a client-supplied body/query parameter. Verified by an automated test that a cross-org `PATCH` by real resource ID returns 404 rather than leaking existence.

## 9. Testing

- `packages/shared`: 28 unit tests on the calculation engine, including 5 realistic end-to-end scenarios matched to the assignment's own worked examples.
- `server`: 21 integration tests (login, RBAC, multi-tenant isolation, user deactivation, org registration/onboarding) against an isolated throwaway SQLite database.
- Manual browser verification of every major flow: dashboard, drug risk explanation + factor breakdown, alert center, full procurement workflow (create → approve → order → receive → inventory updates → risk recalculates), scenario simulator, reports + CSV export, CSV import, Reset Demo Data.
