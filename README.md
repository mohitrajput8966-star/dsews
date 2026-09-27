# Drug Shortage Early Warning System (DSEWS)

> **Predict shortages. Prevent stock-outs. Protect supply continuity.**

A pharmaceutical/hospital supply-chain decision-support application: continuously
monitors drug inventory, consumption, supplier lead time, and criticality to
identify medicines approaching stock-out, explains *why* each one is at risk,
and drives the full response — recommendation → purchase request → approval →
order → receipt → inventory update → risk recalculation.

> Academic prototype (MBA Pharmaceutical Management). Demo system for
> pharmaceutical inventory and supply-chain decision support. It does not
> replace professional procurement, clinical, regulatory, or organizational
> decision-making. All sample data is fictional. No patient data is used.

## Documentation

| Doc | Purpose |
|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | Non-technical guide for a hospital supply-chain manager |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Free-tier deployment: GitHub → Vercel/Netlify → Render → Supabase/Neon |
| [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | Architecture, database schema, folder structure, calculation formulas |
| [SALES_PITCH.md](SALES_PITCH.md) | 5-minute pitch + academic explanation of the underlying concepts |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Phase-by-phase build log (what was built, tested, and why) |

## Monorepo layout

```
DSEWS/
├── packages/shared/   # Shared TS types + the risk/forecast calculation engine (unit-tested)
├── server/            # Express + TypeScript API, Prisma ORM, services, RBAC
│   └── prisma/        # schema.prisma, migrations, seed.ts
└── web/                # React + TypeScript + Tailwind SPA
```

## Tech stack

Frontend: React 18, TypeScript, Vite, Tailwind CSS, Radix primitives, Recharts, TanStack Query, Zustand.
Backend: Node.js, Express, TypeScript, Prisma ORM, JWT auth, Zod validation.
Database: SQLite by default (zero-config, local file) — switch to PostgreSQL/Supabase for production with a 2-line change (see `server/prisma/schema.prisma` and [DEPLOYMENT.md](DEPLOYMENT.md)).

## Quick start (local)

```bash
npm install
cd server && copy .env.example .env    # (or `cp` on macOS/Linux)
cd ..
npm run db:setup     # build shared engine, generate Prisma client, run migration, seed demo data
npm run dev          # starts API (:4000) and web app (:5173) together
```

Open http://localhost:5173 and log in with any demo account below.

- Wipe and regenerate the demo dataset: `npm run db:reset` (deterministic — same 83-drug dataset and risk distribution every time), or use the **Reset Demo Data** button in Settings → Organization while logged in as Admin.
- Run the automated test suite (calculation engine + auth/RBAC/isolation): `npm test`.
- Full production build: `npm run build`.

## Features

- **Risk engine**: ADC, days-of-stock, lead-time demand, safety stock, reorder point, projected stock-out date, a transparent 5-factor risk score, CRITICAL/HIGH/MEDIUM/LOW classification, and a recommended order quantity — all computed live from real database rows (see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for exact formulas).
- **Executive dashboard**: KPI cards, risk distribution, top-10 at-risk medicines, consumption trend, inventory value by category, stock-out timeline, ABC/VED distribution, and a dynamically generated "Today's Supply Chain Actions" list — filterable by location, category, risk, ABC, VED, and supplier.
- **Demand forecasting**: 7/30/90-day averages, moving average / weighted moving average / exponential smoothing, historical-vs-forecast chart.
- **Procurement workflow**: recommendation → purchase request → approval → order → receipt, with inventory and risk automatically updated on receipt (and a real `StockMovement` record written).
- **Alert Center**: critical shortage, high risk, reorder, near-expiry, expired, overstock, and supplier-delay alerts — generated from live state (not hardcoded), with read/unread tracking and a header badge.
- **Reports**: risk, inventory status, expiry, procurement, ABC-VED, and supplier performance — CSV export and print-friendly layout.
- **ABC / VED / FSN analysis**, expiry management, supplier performance, multi-location inventory, and internal **stock-transfer recommendations** (before recommending external procurement).
- **What-If Scenario Simulator**: instant client-side recomputation of the same formulas — never touches real inventory.
- **CSV import** with per-row validation and error reporting, plus a downloadable template.
- Public landing page and product/sales overview page.

## Demo data

Seeded organization: **MedCare Multispecialty Hospital** — 5 locations (Central Medical Store, IP Pharmacy, OP Pharmacy, Emergency Pharmacy, OT Store), 8 suppliers, 83 drugs each stocked at 2 locations (166 inventory positions), 120 days of daily consumption history, and engineered risk scenarios: 10 CRITICAL, 11 HIGH, 16 MEDIUM, 39 LOW (incl. 6 non-moving drugs), 7 overstocked, and 10 expired/near-expiry batches.

**Demo accounts** (all use password `Demo@123`):

| Email | Role |
|---|---|
| admin@dsews.com | Admin |
| scm@dsews.com | Supply Chain Manager |
| pharmacy@dsews.com | Pharmacy Manager |
| warehouse@dsews.com | Warehouse Manager |
| procurement@dsews.com | Procurement Officer |
| hospitaladmin@dsews.com | Hospital Administrator |
| executive@dsews.com | Executive |

## Environment variables

See `server/.env.example` and `web/.env.example`. Summary:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | server | SQLite file path locally; Postgres connection string in production |
| `JWT_SECRET` | server | Signs session tokens — **must** be a long random value in production |
| `JWT_EXPIRES_IN` | server | Session lifetime (default `8h`) |
| `PORT` | server | API port (default `4000`) |
| `CORS_ORIGIN` | server | Comma-separated allowed origins for the web app |
| `VITE_API_URL` | web | Base URL the frontend calls (e.g. `http://localhost:4000/api`) |

No secrets are ever sent to or stored in the frontend bundle.

> Demo system for pharmaceutical inventory and supply-chain decision support. It does not replace professional procurement, clinical, regulatory, or organizational decision-making. All data is fictional.
