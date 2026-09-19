# Ledgerly — Income & Expense Management

A multi-user personal finance web app built with **Next.js 16 (App Router)**, **Prisma 7**, **PostgreSQL** and **Tailwind CSS v4**, with role-based access control.

## Features

| Area | What you get |
|---|---|
| Dashboard | Balance, month income/expenses with month-over-month change, savings rate, 6-month cash-flow chart, spending donut, budgets, recent transactions |
| Transactions | Add / edit / delete, search, filter by type, category, account and date range, pagination, CSV export |
| Budgets | Monthly limit per expense category, progress vs. how far through the month you are |
| Reports | Yearly cash flow, net savings trend, income/expense by category, monthly breakdown table |
| Accounts | Cash / bank / card / savings wallets with opening balance, live balance, archive |
| Categories | Custom income & expense categories with colour and icon |
| Settings | Profile, display currency (LKR default, USD, EUR, GBP, INR, AUD, AED), password change, view your permissions |
| Admin | Platform stats, user directory, create users (temp password), promote/demote, suspend/reactivate, reset password, delete, audit log |
| UX | Light / dark / system theme, responsive layout with mobile drawer, toasts, loading skeletons |

## Roles & access control

Every user owns their own data. Roles add platform capabilities on top:

| Permission | USER | ADMIN |
|---|:-:|:-:|
| `finance:own` – manage own accounts, categories, transactions, budgets | ✅ | ✅ |
| `reports:own` – own reports & CSV export | ✅ | ✅ |
| `users:read` – view user directory | | ✅ |
| `users:manage` – create, suspend, change roles, reset passwords | | ✅ |
| `audit:read` – view audit log | | ✅ |

Admins **cannot** read other users' transactions — they only see aggregate counts.

How it's enforced (defence in depth):

1. **`src/proxy.ts`** (Next 16's replacement for middleware) verifies the signed session cookie, redirects anonymous users to `/login`, returns `401` for anonymous API calls, and blocks `/admin` for non-admins.
2. **Server layouts/pages** call `requireUser()` / `requirePermission()` which re-load the user from the database on every request — so suspensions and role changes apply immediately, even with a valid cookie.
3. **Server actions** re-check permissions and scope every query by `userId` (and verify ownership of the account/category a transaction points to).
4. Safeguards: admins can't change their own role, suspend or delete themselves, and the last active admin can't be removed.

The permission matrix lives in `src/lib/rbac.ts` — add roles or permissions there.

Sessions are HS256 JWTs (via `jose`) in an `httpOnly`, `SameSite=Lax` cookie, 7-day expiry. Passwords are hashed with bcrypt (cost 12). Login has a basic per-email lockout (5 failed attempts → 15 min). Security events (sign-in, user changes, exports) are written to the audit log.

## Quick start (local)

Requirements: Node.js 20+ and Docker (for Postgres).

```bash
cp .env.example .env              # then set AUTH_SECRET: openssl rand -base64 32
docker compose up -d db           # Postgres on localhost:5432
npm install                       # also runs `prisma generate`
npx prisma migrate deploy         # create tables
npm run db:seed                   # admin + demo user with 6 months of sample data
npm run dev                       # http://localhost:3000
```

Seeded logins:

- Admin — `admin@ledgerly.local` / `Admin@12345`
- Demo user — `demo@ledgerly.local` / `Demo@12345`

Change the admin credentials via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, or set `SEED_DEMO=false` to skip demo data. On a fresh install with no seed, the **first account registered becomes the admin**.

## Run everything in Docker

```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
docker compose --profile app up -d --build
```

This starts Postgres, runs a one-off `migrate` container (`prisma migrate deploy` + seed), then the app on port 3000 (standalone Next.js output, non-root user, `/api/health` healthcheck).

Cookies are `Secure` in production, so serve it behind HTTPS (ALB, Nginx, Caddy, Cloudflare). For a quick plain-HTTP test set `INSECURE_COOKIES=true`.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Session signing secret (min 16 chars, use 32+ random bytes) |
| `ALLOW_SIGNUP` | `true` to allow public registration; `false` = admins create accounts |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Initial admin created by the seed |
| `SEED_DEMO` | `false` to skip demo user/sample data |
| `INSECURE_COOKIES` | `true` only for HTTP-only testing in production mode |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | TypeScript type-check |
| `npm run db:migrate` | Create a new migration after editing `schema.prisma` |
| `npm run db:deploy` | Apply migrations (CI/CD, prod) |
| `npm run db:seed` | Seed admin & demo data |
| `npm run db:studio` | Prisma Studio GUI |

## Project structure

```
prisma/
  schema.prisma          data model (User, Account, Category, Transaction, Budget, AuditLog)
  migrations/            SQL migrations
  seed.ts
prisma.config.ts         Prisma 7 config (datasource URL, seed)
src/
  proxy.ts               auth + route guard
  lib/
    rbac.ts              roles → permissions
    auth.ts, session.ts  sessions, requireUser / requirePermission
    queries.ts           dashboard/report aggregations
    prisma.ts            Prisma client (pg driver adapter)
  app/
    (auth)/              login, register, auth server actions
    (app)/               dashboard, transactions, budgets, reports, accounts, categories, settings
    (app)/admin/         overview, users, audit log (admin only)
    api/export           CSV export
    api/health           health check
  components/            UI kit, charts, modals, app shell
```

## Notes

- Money is stored as `DECIMAL(14,2)` — no floating-point rounding errors in the database.
- Prisma 7 uses the `@prisma/adapter-pg` driver adapter (no Rust query engine binary), which keeps Docker images small.
- Multi-currency: each user picks a display currency. Per-transaction currencies with FX conversion would be the next step.
