# DSEWS Deployment Guide

Everything below uses free tiers. No paid service is required to demonstrate the full application.

## 0. What you need

- A GitHub account
- A Render account (free web service) — or Railway/Fly.io equivalent
- A Supabase or Neon account (free Postgres) — for production only; local dev uses SQLite with zero setup
- A Vercel or Netlify account (free static hosting) for the frontend

## 1. Local development

```bash
git clone <your-repo-url>
cd DSEWS
npm install
cp server/.env.example server/.env
cp web/.env.example web/.env
npm run db:setup     # builds the shared package, generates the Prisma client, runs the migration, seeds demo data
npm run dev          # API on :4000, web app on :5173
```

Verify: open http://localhost:5173, log in with `admin@dsews.com` / `Demo@123`.

## 2. GitHub setup

```bash
git init                      # if not already a repo
git add .
git commit -m "DSEWS: full application"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env` files are already git-ignored (`.gitignore`) — only `.env.example` files are committed. Double-check `git status` before pushing that no `.env` or `*.db` file is staged.

## 3. Database migration (production)

1. Create a free Postgres database on **Supabase** (Project → Settings → Database → Connection string, "URI" format) or **Neon**.
2. In `server/prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Locally, with `DATABASE_URL` pointed at the new Postgres instance (temporarily, in `server/.env`):
   ```bash
   cd server
   npx prisma migrate deploy
   ```
   This applies all existing migrations to the new database (no data loss risk — it's a fresh database).

## 4. Seed the production database

Still pointed at the production `DATABASE_URL`:
```bash
cd server
npx tsx prisma/seed.ts
```
This creates the MedCare demo organization with the full 83-drug dataset. (Real customer organizations instead use the in-app **Register your organization** signup flow — see `POST /api/auth/register-organization` — which never touches the demo org.)

## 5. Deploy the API (Render, free web service)

1. Render → New → Web Service → connect your GitHub repo.
2. Root directory: `server`
3. Build command: `npm install --workspace=packages/shared --workspace=server && npm run build --workspace=packages/shared && npm run build --workspace=server`
4. Start command: `node dist/index.js`
5. Environment variables (Render dashboard → Environment):
   - `DATABASE_URL` = your Supabase/Neon connection string
   - `JWT_SECRET` = a long random string (e.g. `openssl rand -hex 32`) — **never reuse the example value**
   - `JWT_EXPIRES_IN` = `8h`
   - `PORT` = `10000` (Render's default; Render sets `PORT` itself, the app reads `process.env.PORT`)
   - `CORS_ORIGIN` = your deployed frontend URL (set after step 6, then redeploy)

## 6. Deploy the frontend (Vercel or Netlify)

**Vercel:**
1. New Project → import the repo → Root Directory: `web`
2. Build command: `npm run build` · Output directory: `dist`
3. Environment variable: `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`
4. Deploy.

**Netlify:** same settings (Base directory `web`, Build command `npm run build`, Publish directory `web/dist`), plus a `web/public/_redirects` file containing `/* /index.html 200` so client-side routing works on refresh.

After the frontend is live, go back to Render and set `CORS_ORIGIN` to that exact URL, then redeploy the API.

## 7. Build commands reference

| Task | Command |
|---|---|
| Build everything | `npm run build` |
| Build shared only | `npm run build --workspace=packages/shared` |
| Build server only | `npm run build --workspace=server` |
| Build web only | `npm run build --workspace=web` |
| Run tests | `npm test` |

## 8. Demo credentials (unchanged in production)

| Email | Password | Role |
|---|---|---|
| admin@dsews.com | Demo@123 | Admin |
| scm@dsews.com | Demo@123 | Supply Chain Manager |
| pharmacy@dsews.com | Demo@123 | Pharmacy Manager |
| warehouse@dsews.com | Demo@123 | Warehouse Manager |
| procurement@dsews.com | Demo@123 | Procurement Officer |
| hospitaladmin@dsews.com | Demo@123 | Hospital Administrator |
| executive@dsews.com | Demo@123 | Executive |

Change these (or deactivate the accounts and create real ones via Settings → Users) before using the deployment for anything beyond a demo.

## 9. Post-deployment checklist

- [ ] `JWT_SECRET` is a unique, long random value (not the `.env.example` placeholder)
- [ ] `CORS_ORIGIN` matches the exact deployed frontend URL
- [ ] No `.env` file is committed to the repository
- [ ] `/api/health` on the deployed API returns `{"status":"ok"}`
- [ ] Login works end-to-end from the deployed frontend
- [ ] "Reset Demo Data" (Settings → Organization, Admin) works if you intend to keep this as a live demo
