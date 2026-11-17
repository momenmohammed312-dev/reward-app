# AGENTS.md — MO2 Loyalty Platform

> **Audience:** AI agents (and humans) working on this repository.
> **Scope:** `G:\development\Loyality Project` — monorepo with two apps (`backend/`, `UI/`) and one database (`DB/`).
> **Ground rule:** every rule below was derived from the *actual code*, not from `session-summary.md` or the BRD. Where documentation and code disagree, **the code wins** and the drift is listed in §5.

---

## 1. Project Overview

MO2 Loyalty is a **multi-tenant SaaS loyalty & rewards platform** for cafés/restaurants. Each tenant (café) runs its own customer base, rewards catalogue, branches and POS integration. The platform is being extended with **cross-tenant loyalty networks** (5 phases; Phase 1 complete).

| Surface | Route prefix | Who | Stack |
|---|---|---|---|
| Customer PWA | `/*` (everything not `/admin`, `/cashier`, `/superadmin`) | End customers (OTP login) | React 19 PWA, mobile-first, RTL Arabic |
| Admin dashboard | `/admin` | Tenant `owner` / `manager` | React 19 + Tailwind v4, dark theme |
| Cashier dashboard | `/cashier` | Tenant `cashier` | React 19, minimal |
| Super admin | `/superadmin` | Platform operator (`superadmin`) | React 19, dark theme |
| REST API | `/api/*` | All | Express 4 + TypeScript, raw SQL over `pg` |

**Core business concepts**

- **Tenant** — one café. Owns customers, branches, rewards, staff, POS credentials, theme.
- **Customer** — identified by `phone`, unique **per tenant only** (same phone in two tenants = two customers).
- **Wallet ledger** — append-only point movements. `points` is always positive; the **sign is implied by `type`**.
- **Redemption** — customer spends points → gets a code → cashier validates it at checkout.
- **Network** (Phase 1+) — a group of tenants sharing points; a tenant may belong to **many** networks.

---

## 2. Repository Map

```
backend/                  Node + Express + TypeScript API
  src/
    index.ts              bootstrap: DB check → Redis (optional) → listen → ExpiryService scheduler
    app.ts                Express wiring: helmet, CORS, rate limiters, route mounts, 404, error handler
    config/               db.ts (pg Pool), redis.ts (optional client), swagger.ts (swagger-jsdoc)
    controllers/          request handlers (admin, auth, loyalty, network, superadmin, tenant, webhook)
    helpers/              resolveTenant.ts (slug|uuid → uuid), points.ts, phone.ts (pure fns)
    middlewares/          auth.ts (JWT + requireRole + requireSubscription),
                          rateLimit.ts, validate.ts (Zod schemas)
    routes/               one router file per surface (auth, tenant, loyalty, admin, rewards,
                          superadmin, superadminNetwork, tenantNetwork, webhook)
    services/             business logic: loyalty.ts, ledger.ts, network.ts, expiry.ts, otp.ts,
                          webhookProcessor.ts (BullMQ), pos/ (adapter registry)
    seed.ts               seed script (tenants, users, rewards, superadmin)
  scripts/                operational scripts
  ecosystem.config.cjs    PM2 (cluster mode, instances: max)
  Dockerfile
UI/                       React 19 + Vite 6 + Tailwind v4 frontend
  src/
    App.tsx               router (CustomerApp splat + admin/cashier/superadmin routes)
    CustomerApp.tsx       customer shell: tabs + sub-pages (main | redeem-detail | code-display)
    pages/                Auth, Home, Menu, Rewards, Redeem, History, Profile,
                          AdminAuth, AdminDashboard (76 KB), CashierDashboard, SuperAdminDashboard (35 KB)
    layouts/              AppLayout (customer, bottom nav), AdminLayout, AuthLayout
    components/           ui/ (Badge, Button, Card, Input, Modal, BottomSheet, OtpInput,
                          ProgressBar, Spinner, Toast), loyalty/ (PointsWallet, RewardCard,
                          RedemptionCode, TransactionRow, ProgressMilestone), MyNetworks,
                          ProtectedRoute, ErrorBoundary
    services/             api.ts (fetch wrapper), translations.ts (ar/en + RTL), mockData.ts
    store/                AppContext.tsx (single global React context)
    theme/                tokens.css (CSS variables), fonts.css, themeLoader.ts (per-tenant theme)
DB/
  schema.sql              **bootstrap only** (initial tables/views/triggers)
  migrations/001..010     **source of truth** for schema changes (numbered, idempotent)
  db-diagram.tsx          ER diagram (React artifact)
docker-compose.yml        postgres:16 (5433) + redis:7 (6379) + backend (4000)
.agents/skills/           local skill library (1 448 skills) — **git-ignored**
```

---

## 3. Architecture as Implemented

### 3.1 Backend layering (strict, 4 layers)

```
route  →  middleware (auth → role → subscription → Zod validate)  →  controller  →  service  →  pg
```

- **Routes** declare middleware chains only. Never contain SQL.
- **Controllers** own HTTP semantics: status codes, response shape, `try/catch → res.status(...)`. They call **one** service method.
- **Services** own business logic and SQL. They throw; they do **not** touch `res`.
- **Helpers** are pure functions (`points.ts`, `phone.ts`) — unit-testable, no I/O.
- **Config** owns connections (`db.ts`, `redis.ts`).

### 3.2 Data access

- **Raw SQL only.** No ORM. `pg` `Pool`; long transactions use `db.pool.connect()` + `BEGIN/COMMIT/ROLLBACK` + `client.release()` in `finally`.
- Parameterised queries everywhere. UUID columns are compared as `$n::uuid` — a bare string parameter against a `uuid` column raises `invalid input syntax for type uuid` at runtime, which is why every tenant-scoped query in this repo carries the cast.
- `deleted_at` soft delete on `customers`, `rewards`, `branches` → every read of those tables needs `AND deleted_at IS NULL`.

### 3.3 The ledger (single most important invariant)

`backend/src/services/ledger.ts` is the **only** sanctioned write path to `wallet_ledger`.

```
wallet_ledger(type, points>0, idempotency_key?)
  earned / bonus / refund / adjustment  → credit   (+points)
  redeemed / expired / reversal         → debit    (−points)
```

- `idempotency_key` is protected by a **partial unique index** (`DB/migrations/008`) → retried jobs can never double-post points.
- Balance is **derived**, never stored: `customer_balances` view → `customer_summary` view → `get_customer_balance()`.
- Expiry is **FIFO**: `services/expiry.ts` walks the ledger oldest-first and writes an `expired` entry for credits past `tenants.points_expiry_days`.
- Tiers are **configurable**: `tier_benefits` (tenant-specific rows override `tenant_id IS NULL` system defaults).

### 3.4 Auth model

| Actor | Credential | Token |
|---|---|---|
| Staff | email + bcrypt(10) | JWT 24 h — `id`, `tenant_id`, `email`, `role`, `branch_id` |
| Customer | phone + 6-digit OTP | access JWT 1 h + refresh JWT 30 d (separate secret, `type: 'refresh'`) |
| Superadmin | seed-created only | JWT 24 h, `role: 'superadmin'` |

Roles: `owner`, `manager`, `cashier` (per tenant) + `superadmin` (platform) + `customer` (implicit).

**Two things about `users` that surprise people:**
- `users.tenant_id` is **nullable** (migration `004`) so a platform superadmin can exist outside any tenant. A superadmin row has `tenant_id = NULL`.
- `users` has `UNIQUE (tenant_id, email)`, but `loginUser` looks up by **email alone** (`WHERE u.email = $1`), so a staff email must be unique across the whole platform in practice — the DB constraint is looser than the login behaviour.

### 3.5 Multi-tenancy model

- **Shared schema, `tenant_id` column** on every tenant-owned table. No PostgreSQL RLS is enabled.
- Tenant context comes from **two** sources, never from the request body:
  1. `req.user.tenant_id` — decoded from the JWT (all authenticated admin/customer routes).
  2. `resolveTenantId(raw)` — `helpers/resolveTenant.ts`, accepts a **UUID or a slug** and resolves it to a UUID. Used on **public** routes only (`/api/tenants/public/:slug`, `/api/auth/customer/*`, `/api/rewards`).
- `customer_balances` / `customer_summary` group by `(tenant_id, customer_id)`.

### 3.6 Integrations

- **POS**: `services/pos/` — a `PosAdapter` interface, an `adapterRegistry`, and one adapter (`foodicsAdapter`). The engine is vendor-agnostic; `getAdapter()` fails open to Foodics.
- **Webhooks**: `POST /api/webhooks/foodics/:tenant_id` → HMAC-SHA256 signature check (per-tenant branch `api_key`, falling back to `FOODICS_WEBHOOK_SECRET`) → row in `webhook_logs` → BullMQ job → worker resolves customer/branch and awards points → responds `202` immediately.
- **SMS / OTP**: `services/otp.ts` → VictoryLink XML API (`VICTORYLINK_USERNAME` / `VICTORYLINK_PASSWORD` / `VICTORYLINK_SENDER`).
- **Docs**: `swagger-jsdoc` scans `src/routes/*.ts`; served at `/api/docs` (superadmin-only) and `/api/docs.json`.

### 3.7 Frontend layering

```
page → component → services/api.ts (fetch) → backend
                    services/translations.ts (t(lang,key))
                    theme/tokens.css (CSS variables) + themeLoader.ts (per-tenant override)
```

- **One** global store: `store/AppContext.tsx` (`useApp()`), no Redux/Zustand.
- **Theming** is CSS-variable driven: `theme/tokens.css` defines `--color-*`, `--radius-*`, `--font-*`; `applyTenantTheme(tenant)` overrides them per tenant at runtime. Never hardcode hex colours in components.
- **RTL** is global: `index.css` sets `direction: rtl` on `html, body, button, input, select, textarea`. `AppContext` toggles `document.documentElement.dir` between `rtl` (ar) and `ltr` (en). Numeric/code elements use the `.number` / `.code-display` classes to force LTR.
- **Routing**: `App.tsx` renders `<Route path="/*">` → `CustomerApp`; admin/cashier/superadmin routes are more specific and win by React Router's ranking (not by file order).
- **PWA**: `vite-plugin-pwa` with `registerType: 'autoUpdate'` and a `NetworkFirst` runtime cache for `/api/*`.

---

## 4. Project-Specific Principles

### 4.1 Architecture Rules

1. Keep the 4-layer split: **routes → controllers → services → SQL**. A `db.query` inside a route file or a `res` inside a service is a defect.
2. One controller method = one service call. Controllers must not contain SQL.
3. Services must not import `express` types. Business errors are thrown; controllers translate them to HTTP codes.
4. Business logic lives in **exactly one** place. If two files compute the same thing, one is wrong.
5. New cross-cutting behaviour (a new POS vendor, a new ledger type, a new notification channel) goes through the **existing extension point** — `pos/adapterRegistry.ts`, `ledger.ts`, `services/otp.ts` — not through conditional branches scattered across controllers.
6. Do not introduce an ORM, a state manager, a DI container, or a test framework that is not already in `package.json`. This project deliberately uses raw SQL + `pg`.
7. Add new route groups in a **separate router file** (see `superadminNetworkRoutes.ts` / `tenantNetworkRoutes.ts`) and mount them in `app.ts`.
8. **Do not rely on Express mount ordering.** `app.use(prefix, router)` matches by prefix and falls through when the sub-router does not handle the path — which is why the current order (generic `/api/superadmin` mounted before `/api/superadmin/networks`, and `/api/tenants` mounted twice) works. The danger is the opposite case: a **catch-all** (`router.use(...)`) inside a broad mount *will* shadow every later mount. When adding a route, verify no earlier mount swallows the path, and never add a catch-all to a shared prefix.

### 4.2 Coding Standards

- **TypeScript strict** is on (`backend/tsconfig.json` → `strict: true`, `module: NodeNext`). No `any` in new signatures; no `@ts-ignore`.
- **ESM only.** Backend uses `NodeNext` → **relative imports must carry the `.js` extension** (`import { db } from '../config/db.js'`). Getting this wrong breaks the compiled `dist/` output, not `tsx dev`.
- **Naming**
  - Files: `camelCase.ts` for services/helpers/controllers, `PascalCase.tsx` for React components.
  - DB: `snake_case` columns and tables. TS interfaces mirror the DB in `snake_case` when they represent raw rows (`network.ts` does this); API payloads use `camelCase` aliases in SQL (`AS "pointsRequired"`).
  - Components: `PascalCase.tsx`. UI primitives live in `UI/src/components/ui/`.
- **Comments** explain *why*, not *what*. The existing code documents invariants (idempotency, transaction ownership) — match that density.
- **No dead code.** Do not leave commented-out blocks, unused imports, or scratch files. (`backend/_check.mjs`, `_migrate.mjs`, `_setup.mjs` are leftover scratch scripts — do not copy that pattern.)
- **UI strings**: customer-facing Arabic/English text goes through `services/translations.ts` via `t('key')`. Do **not** hardcode Arabic in components (several pages still do — do not copy that; add a key instead).
- **Code comments and identifiers are English.** Arabic only in user-facing strings and in `DB/`/`phases explain/` documentation.

### 4.3 Database Rules

1. **`DB/schema.sql` is a bootstrap, not the source of truth.** It is only mounted as `docker-entrypoint-initdb.d/01-schema.sql` for a **fresh** container. It does **not** contain migrations 001–010 (no `tier_benefits`, `admin_activity_log`, `deleted_at`, `idempotency_key`, `networks`, `reversal` type). **Never** edit `schema.sql` to add a column — write a migration.
2. **Every schema change is a new numbered migration** in `DB/migrations/NNN_name.sql`, following the existing pattern:
   ```sql
   -- Migration: NNN_name
   -- Description: ...
   BEGIN;
   ... DDL ...
   COMMIT;
   ```
   - Always `IF NOT EXISTS` / `IF EXISTS` so re-runs are safe.
   - `ALTER TYPE ... ADD VALUE IF NOT EXISTS` must be its **own** transaction (it cannot run inside a transaction block in older PG; PG 12+ allows it but the existing file keeps it separate — follow the existing file's structure).
   - Recreate a view with `CREATE OR REPLACE VIEW` when its definition changes (see `005`, `009`).
   - Add an index for every new query pattern; use **partial** indexes where the filter is a boolean (`WHERE deleted_at IS NULL`, `WHERE idempotency_key IS NOT NULL`).
3. **Register the new migration in `docker-compose.yml`** under `postgres.volumes` with the next sequential filename (`12-migration-011.sql`, …). **Missing this is the single most common way to silently get a stale database.**
4. UUID columns: compare with `$n::uuid`. Cast enums too (`$n::tier_type`, `$n::reward_type`, `$n::time`).
5. **Never** `SELECT *` into application logic for tables that evolve; list columns explicitly.
6. Soft delete: `customers`, `rewards`, `branches` have `deleted_at`. All reads need `AND deleted_at IS NULL`; deletes are `UPDATE … SET deleted_at = NOW()`.
7. Triggers/views that compute balances live in the DB (`customer_balances`, `customer_summary`, `update_customer_tier()`, `log_tier_change()`). A migration that changes one of them must redefine it.

### 4.4 Multi-Tenancy Rules

1. **Every** query against a tenant-owned table must include a tenant predicate: `WHERE tenant_id = $1::uuid`, with `$1` = `req.user!.tenant_id`.
2. **Never** take `tenant_id` from `req.body` or `req.query` on an authenticated route. The tenant is whatever the JWT says.
3. For public routes, resolve slug → UUID via `resolveTenantId()` **before** touching a `uuid` column, and 404 if it returns `null`.
4. When a route accepts a resource id (customer, reward, branch, redemption), **verify ownership in the same query**:
   `WHERE id = $1::uuid AND tenant_id = $2::uuid`. A 404 on zero rows is the correct response — never a 403 that leaks existence.
5. `customers.phone` is unique **per tenant** (`unique_tenant_phone`). A phone may legitimately exist in many tenants. Never treat a phone as a global identity — that is exactly what Phase 5 (network customers + OTP linking) has to solve deliberately.
6. **Cross-tenant reads are a deliberate, reviewed feature** (network membership), not a convenience. Any query that intentionally spans tenants must:
   - go through the `networks` / `network_memberships` tables,
   - be justified in a comment,
   - never widen the scope of a per-tenant admin endpoint.
7. `superadmin` endpoints (`app.use('/api/superadmin', …)`) are the only ones allowed to read across tenants. `requireRole(['superadmin'])` is mandatory on every one of them.

### 4.5 Security Requirements

1. **Secrets come from env only.** `JWT_SECRET` and `JWT_REFRESH_SECRET` are mandatory — the process throws at boot if either is missing (`middlewares/auth.ts`, `controllers/authController.ts`). Never commit `.env` (root `.gitignore` already covers it). Never inline a secret, including a "temporary" default in `docker-compose.yml` (the current `${JWT_SECRET:-m02_l0y4lty_…}` default is a known gap — see §5).
2. **Hash passwords with `bcrypt`** (cost 10). Never store or log plaintext.
3. **Rate limiting is mandatory** on any new auth-adjacent or webhook route. Use the existing limiters in `middlewares/rateLimit.ts`; add a new one only with a distinct threat profile.
4. **Zod-validate every request body** through `middlewares/validate.ts` → `schemas`. Add the schema there, not inline in the controller. The middleware returns `400` with `{ error: 'Validation Error', details: [...] }`.
5. **A `superadmin` role must never be creatable from a public endpoint.** `authController.registerUser` rejects `role === 'superadmin'` explicitly, and `schemas.register` omits it. Keep both guards.
6. **Role guards belong on the route**, not inside the controller: `authenticateJWT` → `requireRole([...])` → `requireSubscription` → `validate(schema)` → handler. `adminRoutes.ts` applies `router.use(authenticateJWT, requireRole(['owner','manager']), requireSubscription)` to the whole router.
7. **Audit privileged mutations** with `logAdminAction(...)` → `admin_activity_log` (see `adminController.ts` / `loyaltyController.ts`). The helper swallows its own errors and never breaks the request.
8. **Webhooks must be signature-verified.** The HMAC check in `webhookController.ts` is skipped when no secret is configured — treat "no secret configured" as a misconfiguration to fix, not a normal mode.
9. **Never leak internals.** Error responses expose `error.message` only when `NODE_ENV !== 'production'` (`app.ts` error handler). Keep that guard.
10. **OTP specifics**: codes are 6 digits, expire after `OTP_EXPIRY_MINUTES` (default 5), are consumed atomically on verification, and are capped at `max_attempts` (5). The verification query uses `FOR UPDATE` inside a subquery — preserve that pattern; it is what prevents a race.
11. **Never log a live OTP or password.** `services/otp.ts` currently logs the code on SMS failure — that path must stay development-only.

### 4.6 API & Integration Rules

1. **Route prefix conventions**
   - Public: `/api/tenants/public/:slug`, `/api/rewards?tenant_id=`, `/api/webhooks/:pos/:tenant_id`.
   - Customer: `/api/loyalty/*`, `/api/auth/customer/*`.
   - Tenant admin: `/api/admin/*` (role + subscription guarded), `/api/tenants/me*`.
   - Platform: `/api/superadmin/*` (`superadmin` only).
   - Network tenant-scoped: `/api/tenants/me/networks*`.
2. **Response envelope**: admin/tenant endpoints return the bare row(s) or `{ message, ... }`. Network endpoints return `{ networks: [...] }` / `{ network }` / `{ membership }`. Keep one convention **per router family** and be explicit when adding a new one.
3. **Error shape**: `{ error: <short machine code>, message?: <human text> }`. Use the existing `ERROR_RESPONSES` map pattern (`networkController.ts`) for domain errors.
4. **Every new route gets a Swagger doc block** (`@swagger` JSDoc) — `swagger-jsdoc` scans `src/routes/*.ts` automatically. Add the tag to `config/swagger.ts` when introducing a new surface.
5. **Webhooks** must: verify the signature → persist to `webhook_logs` (`pending`) → enqueue → respond `202`. Never do the business work inline; the POS expects a fast response and the queue provides retries.
6. **BullMQ jobs** must be **idempotent** — retry-safe by construction. Use `idempotencyKey` on every ledger write. Current queue: `foodics-webhooks`, 5 attempts, exponential backoff from 5 s, `removeOnFail: false`.
7. **POS adapters** implement `PosAdapter.parseOrder(payload) → PosOrder` and register themselves in `adapterRegistry.ts`. Never let vendor-specific field access leak into `webhookProcessor.ts` or `loyalty.ts`.
8. **Frontend API calls** go through `services/api.ts`. Use `getHeaders()` for customer tokens and `getSuperAdminHeaders()` for superadmin tokens — a wrong token key was a real bug here.
9. **Pagination**: list endpoints accept `page` (≥1) and `limit` (capped: admin 200, loyalty 100) and return `{ rows|items, total, page, limit }`.

### 4.7 Testing Requirements

- **Backend**: `npm test` → `vitest run`. Tests live in `backend/src/**/__tests__/*.test.ts` and are excluded from the `tsc` build (`tsconfig.json` `exclude`).
- **What must be tested**: pure business logic and money math, not HTTP plumbing. Current coverage is exactly that — `helpers/points.ts` (point calculation + tier multiplier + minimum threshold), `helpers/phone.ts` (Egyptian phone normalisation), `services/expiry.ts` (FIFO expiry), `services/pos/foodicsAdapter.ts` (payload mapping).
- **Required test targets for new work**
  - Any new calculation → a pure function + unit test (extract from the service first).
  - Any new ledger write path → an idempotency test (call twice, assert one row).
  - Any new SQL filter on `tenant_id` → a test that a foreign tenant's id returns 404.
  - Any new adapter → payload-mapping tests including the missing-field fallbacks.
- **Frontend**: there is currently **no test runner** in `UI/package.json` and no UI tests. Do not claim UI behaviour is verified by tests. If UI tests are added, `webapp-testing` (Playwright) is the chosen approach.
- **Backend lint** (`npm run lint` → `eslint src/**/*.ts`) is **currently broken** — `eslint` is not installed. Until it is fixed, rely on `npm run build` (which type-checks) as the correctness gate, and do not report "lint passed".
- **Before claiming any work is complete**, run and pass:
  ```bash
  cd backend && npm run build && npm test
  cd UI      && npm run lint      # tsc --noEmit
  ```

### 4.8 Performance Guidelines

1. **Indexes first.** Every query filter on `(tenant_id, ...)` needs a composite index. Existing: `idx_customers_tenant_phone`, `idx_wallet_ledger_tenant_customer`, `idx_transactions_invoice`, `idx_redemptions_code`, `idx_webhook_logs_status`, plus partial indexes for soft-delete and idempotency.
2. **Use the views.** `customer_summary` and `customer_balances` exist so balances are not recomputed ad hoc in application code. Do not hand-roll balance sums in a controller.
3. **Use `FOR UPDATE`** when reading a balance you are about to mutate (`redeemReward`, `adjustPoints` lock the customer row). Do not remove it — it is what prevents double-spend.
4. **Long operations go through BullMQ**, not the request cycle: webhook processing, points expiry, and (in Phase 4) settlement.
5. **Redis is optional.** `config/redis.ts` is designed to degrade gracefully: `connectRedis()` returns `false` and the app continues; `reconnectStrategy: false` avoids a retry storm. Always guard with `isRedisReady()` before using the client. Never make Redis a hard boot dependency.
6. **The expiry scheduler runs in-process** (`ExpiryService.startScheduler()` — 60 s after boot, then every 24 h). Under PM2 cluster mode (`instances: 'max'`) it runs in **every** instance; correctness relies on the `expiry:<ledgerId>` idempotency key. If you move it to a dedicated worker, remove the in-process scheduler.
7. **Frontend**: keep the PWA `NetworkFirst` cache for `/api/*`; tenant theme changes are CSS-variable writes (cheap) — do not re-render the tree to restyle.
8. **Two UI files are monoliths** — `UI/src/pages/AdminDashboard.tsx` (76 KB) and `SuperAdminDashboard.tsx` (35 KB). Prefer **adding a new component file** (as `components/MyNetworks.tsx` does) over growing them further. Splitting them wholesale requires approval.

### 4.9 Error Handling

1. **Backend**: every controller wraps its body in `try/catch`, logs with `logger.error('<Context> error', { error: err.message })` (Winston, structured metadata), and returns a **sanitised** error. Use `services/logger.ts` — never `console.log`.
2. **Domain errors** are typed and mapped, not string-matched. `NetworkError` + the `ERROR_RESPONSES` map is the reference pattern. Extend it rather than inventing a new convention.
3. **Validation errors** → `400` with `{ error: 'Validation Error', details: [{ field, message }] }` (from the Zod middleware).
4. **Database errors**: map known Postgres codes — `23505` (unique violation) → `409`, `23503` (FK violation) → `400`/`409`. `adminController.updateCustomer` handles `23505` explicitly; follow that.
5. **Never leak SQL or stack traces** to the client. The global handler in `app.ts` only adds `message` in non-production.
6. **Frontend**: every `api.ts` call must be wrapped by the caller in `try/catch` and must surface a user-visible error (`Toast` / `globalError`). **Do not swallow a failed API call and silently fall back to mock data** — several pages in `AppContext.tsx` currently do this (`sendOtp` returns `true` on failure; `redeemReward` generates a fake code locally). New code must not copy that pattern; a failed redemption must not fabricate a redemption code client-side.
7. **Never hide an error behind a workaround.** If something is broken, say so and state the root cause.

### 4.10 Development Workflow

1. **Phased delivery.** Features land in numbered phases; each phase is independently deployable and ends with tests. Do not start the next phase before the current one compiles and its tests pass.
2. **The standard phase shape** (observed in Phase 1):
   `DB/migrations/NNN_*.sql` → `services/<domain>.ts` → `controllers/<domain>Controller.ts` → `routes/<scope>Routes.ts` → register in `app.ts` → Zod schemas in `middlewares/validate.ts` → `UI/src/services/api.ts` → UI page/component → tests → refactor.
3. **Verify before committing**:
   ```bash
   cd backend && npm run build && npm test
   cd UI      && npm run lint && npm run build
   docker compose up -d          # DB must apply every migration
   ```
4. **Database changes are not optional artefacts.** A migration without a `docker-compose.yml` volume entry is an incomplete change.
5. **Keep `docker-compose.yml` in sync** with `DB/migrations/` — one volume line per migration, sequential numbering.
6. **Never commit**: `.env`, `dist/`, `node_modules/`, `data/pg/`, `data/redis/`, `logs/`, `*.log`, `.agents/`.
7. **Branch/commit convention**: conventional commits, small focused diffs, one phase per PR. Use the `commit` and `pr-writer` skills.

---

## 5. Known Gaps & Drift (verified 2026-11-15)

These are **verified facts**, not assumptions. They are listed so agents do not assume a feature exists because it is in the plan, and so they do not "fix" them silently mid-task.

### 5.1 Documentation vs code
| Claim | Reality |
|---|---|
| `session-summary.md`: "point_exchange_rates already exists in schema.sql" | **It does not exist** anywhere in `DB/`. Phase 2 must `CREATE` it. |
| `session-summary.md`: "Phase 1 complete" | Accurate for networks/memberships. Phases 2–5 (exchange rates, network ledger, settlements, network customers) **do not exist**. |
| `session-summary.md`: "route order matters in app.ts" | Express falls through unmatched paths, so order is not strictly required. Kept as a defensive convention. |

### 5.2 Security gaps (do not assume these are fixed)
| Issue | Where |
|---|---|
| `POST /api/tenants` (create tenant) is guarded only by `authenticateJWT` — **no role check**, so any authenticated user (including a `customer` token) can create a tenant | `routes/tenantRoutes.ts` |
| `POST /api/tenants/branches` — only `authenticateJWT`; a `cashier` can create branches | `routes/tenantRoutes.ts` |
| `PATCH /api/tenants/me` — only `authenticateJWT`; a `cashier` can change tenant branding / `points_per_egp` | `routes/tenantRoutes.ts` |
| `POST /api/auth/register` is public and allows `role: 'owner'` → anyone can self-register as an owner of any tenant | `controllers/authController.ts`, `middlewares/validate.ts` |
| `docker-compose.yml` ships a **hardcoded default JWT secret** | `docker-compose.yml` |
| OTP codes are generated with `Math.random()` (not `crypto`) | `services/otp.ts` |
| On SMS failure the OTP code is written to the log | `services/otp.ts` |
| `SMS_PROVIDER` env var is read nowhere; the provider is always VictoryLink, and `.env` uses `SMS_USERNAME`/`SMS_PASSWORD`/`SMS_SENDER_NAME` while the code reads `VICTORYLINK_USERNAME`/`VICTORYLINK_PASSWORD`/`VICTORYLINK_SENDER` → **SMS never actually sends** | `services/otp.ts`, `backend/.env` |
| `JWT_REFRESH_SECRET` is missing from `backend/.env.example` even though the code throws without it | `backend/.env.example` |

### 5.3 Consistency drift
- `adminEarnPointsManual` inserts **directly** into `wallet_ledger`, bypassing `LedgerService.insert` → no `idempotency_key`. It is the one write path that violates the single-write-path rule.
- `LoyaltyService.getCustomerPointsSummary(customerId)` queries `customer_summary WHERE id = $1` with **no `tenant_id` predicate** (safe only because the id comes from the JWT).
- `backend/package.json` declares `"lint": "eslint src/**/*.ts"` but `eslint` is **not** a devDependency → the script fails.
- `backend/tsconfig.json` excludes `*.test.ts` from the build → test files are **not** type-checked by `npm run build`.
- `DB/schema.sql` is behind migrations 001–010 (no `tier_benefits`, `admin_activity_log`, `deleted_at`, `idempotency_key`, `networks`, `reversal`). A DB rebuilt from `schema.sql` alone is wrong.
- `backend/_check.mjs`, `_check_mig.mjs`, `_migrate.mjs`, `_setup.mjs` are scratch scripts committed to git.
- `UI/src/services/mockData.ts` is still imported by `store/AppContext.tsx` and `layouts/AdminLayout.tsx`; tenant selection in the customer app is **mock-only** (`selectTenant` simulates a network call with `setTimeout`).
- `UI/src/main.tsx` deletes **all** service-worker registrations and caches on every page load → the PWA offline behaviour configured in `vite.config.ts` is disabled in practice.
- `backend/ecosystem.config.cjs` runs PM2 in cluster mode → the expiry scheduler and the BullMQ worker start in **every** instance.
- No CI (`.github/workflows` does not exist). No `AGENTS.md` until this file. No ESLint config. No UI test runner.

---

## 6. Mandatory Principles for Any Agent Working on This Repo

1. **Read the existing code before proposing a change.** Locate the real implementation first; do not infer behaviour from file names, the BRD, or `session-summary.md`.
2. **Never assume a planned feature exists.** Phase 2–5 of the cross-tenant network work are **not implemented**. Verify with a search before building on top of them.
3. **Do not rebuild what already works.** The ledger, the POS adapter registry, the Zod middleware, the CSS-variable theming and the RTL handling are working, load-bearing designs. Extend them, do not replace them.
4. **No wide refactoring without a reason and explicit approval.** Especially `AdminDashboard.tsx` (76 KB) and `SuperAdminDashboard.tsx` (35 KB). Add a new file instead of growing them.
5. **No new dependency without a written justification** and a check that the existing stack cannot already do it.
6. **Preserve separation of concerns:** routes → controllers → services → SQL; pages → components → `api.ts`.
7. **Avoid over-engineering.** No speculative abstractions, no configuration layers for requirements that do not exist yet, no interfaces with a single implementation used for its own sake.
8. **Security and tenant isolation are not optional.** Every query is tenant-scoped, every privileged route is role-guarded, every mutation of points goes through the idempotent ledger path.
9. **Never duplicate business logic.** One owner per rule: points math → `helpers/points.ts`; ledger writes → `services/ledger.ts`; phone normalisation → `helpers/phone.ts`; tier rules → DB `tier_benefits`; translations → `services/translations.ts`.
10. **Never hide an error or ship a workaround without saying so.** Do not silently swallow an exception, do not fall back to fake data on a failed write, do not bypass a failed check.
11. **Find the root cause before proposing a fix.** State it explicitly. Do not patch a symptom.
12. **Do not modify application code during an analysis-only task.** The only file to create without an explicit implementation request is this `AGENTS.md`.

---

# Part B — Relevant Skills

## B.1 How to access the skill library

The library lives **inside the project but outside version control**:

```
G:\development\Loyality Project\.agents\skills\<skill-name>\SKILL.md
```

- `G:\development\Loyality Project\.agents\` is listed in the root `.gitignore` → skills are **local only** and never committed.
- **1 448** skill directories are installed; **1 444** contain a valid `SKILL.md` with YAML frontmatter (`name`, `description`, and optionally `risk`, `source`, `date_added`, `tags`, `tools`).
- The catalogue was indexed by parsing frontmatter only (name + description + tags), **not** by reading every file. The generated index used for selection is at `E:\temp\opencode\skills-index.json`.
- 4 directories are **incomplete** (no `SKILL.md`): `docs`, `libreoffice`, `security`, `windows-privilege-escalation`. Their global equivalents still resolve; do not rely on the local copies.

**How to read a skill:** read the file directly, then follow its `SKILL.md` body. Most skills also carry supporting files (`references/`, `scripts/`, `assets/`) in the same directory — check the directory listing, not just `SKILL.md`.

```bash
# read one skill
cat "G:\development\Loyality Project\.agents\skills\saas-multi-tenant\SKILL.md"

# list what a skill ships with
ls "G:\development\Loyality Project\.agents\skills\postgres-best-practices"

# find a skill by capability (frontmatter description + tags)
grep -rl "multi-tenan" "G:\development\Loyality Project\.agents\skills" --include=SKILL.md
```

**Selection criteria:** a skill was included only if it maps to a **stack element actually present in this repo** (Express+`pg`+Zod+BullMQ+Redis / React 19+Vite 6+Tailwind v4 / PostgreSQL 16 / Docker+PM2), or to a **verified gap** in §5, or to a **phase still to be built** (§8). Framework skills for absent stacks (Angular, Vue, Next.js, Laravel, Django, Spring, .NET, Flutter, Swift, Unity, LLM/AI frameworks) were deliberately excluded.

---

## B.2 Selected skills (103 distinct skills, listed as table entries — some rows group related skills together)

### Software Architecture
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `software-architecture` | Quality-focused architecture guidance for writing/refactoring code | Designing a new module or questioning an existing boundary | `.agents/skills/software-architecture/SKILL.md` |
| `senior-architect` | Modern architecture tooling and decision practice | Choosing between two structural options | `.agents/skills/senior-architect/SKILL.md` |
| `architecture-patterns` | Clean / Hexagonal / DDD backend patterns | Only if a real refactor is authorised — this repo is layered, not hexagonal | `.agents/skills/architecture-patterns/SKILL.md` |
| `cc-skill-backend-patterns` | Backend architecture, API design, DB optimisation for Node/Express/Next | Reviewing a new backend service against the existing layering | `.agents/skills/cc-skill-backend-patterns/SKILL.md` |

### React / Frontend
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `react-best-practices` | React 19 + Next performance rules (Vercel-maintained) | Writing or reviewing any component | `.agents/skills/react-best-practices/SKILL.md` |
| `react-component-performance` | Diagnoses slow components and proposes targeted fixes | `AdminDashboard.tsx` (76 KB) / `SuperAdminDashboard.tsx` (35 KB) render cost | `.agents/skills/react-component-performance/SKILL.md` |
| `react-ui-patterns` | Loading, empty, error and data-display states | Any new page or list | `.agents/skills/react-ui-patterns/SKILL.md` |
| `react-state-management` | Modern state patterns (Zustand/Jotai/Redux/Query) | Judging whether `AppContext.tsx` should be split | `.agents/skills/react-state-management/SKILL.md` |
| `tailwind-patterns` | Tailwind **v4** CSS-first config, container queries, tokens | The UI uses Tailwind v4 with `@theme` in `index.css` | `.agents/skills/tailwind-patterns/SKILL.md` |
| `frontend-api-integration-patterns` | Race conditions, cancellation, retry, error normalisation, UI state | `services/api.ts` is a hand-rolled `fetch` wrapper — extend it correctly | `.agents/skills/frontend-api-integration-patterns/SKILL.md` |
| `native-data-fetching` | Fetch/React Query/SWR and offline patterns | Any new data call or cache | `.agents/skills/native-data-fetching/SKILL.md` |
| `progressive-web-app` | Service workers, installability, caching | The customer app is a PWA (and `main.tsx` currently kills the SW) | `.agents/skills/progressive-web-app/SKILL.md` |
| `mobile-design` | Mobile-first, touch-first, platform-respectful UI | The customer PWA is the primary mobile surface | `.agents/skills/mobile-design/SKILL.md` |
| `i18n-localization` | Hardcoded-string detection, locale files, RTL support | `translations.ts` is hand-rolled; Arabic strings are hardcoded in several pages | `.agents/skills/i18n-localization/SKILL.md` |

### Node.js / Backend
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `nodejs-backend-patterns` | Scalable, maintainable Node/Express patterns | Any new controller/service/route | `.agents/skills/nodejs-backend-patterns/SKILL.md` |
| `backend-dev-guidelines` | Senior backend engineer constraints on reliability & architecture | Reviewing a backend change | `.agents/skills/backend-dev-guidelines/SKILL.md` |
| `bullmq-specialist` | Redis-backed queues, workers, retries, idempotency | `services/webhookProcessor.ts`; required for Phase 4 settlement jobs | `.agents/skills/bullmq-specialist/SKILL.md` |
| `zod-validation-expert` | Zod schemas, refinements, error shaping | Every new body/query validation in `middlewares/validate.ts` | `.agents/skills/zod-validation-expert/SKILL.md` |
| `event-sourcing-architect` | Event stores, projections, event-sourced ledgers | Designing the Phase 3 `network_points_ledger` | `.agents/skills/event-sourcing-architect/SKILL.md` |

### Billing, Settlement & Domain Logic
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `saga-orchestration` | Multi-step distributed transactions and compensations | Phase 3 cross-tenant redemption and Phase 4 settlement state machines | `.agents/skills/saga-orchestration/SKILL.md` |
| `billing-automation` | Recurring billing, invoices, dunning, proration | Phase 4 "settle via subscription deduction" — `subscriptions` / `billing_history` already exist | `.agents/skills/billing-automation/SKILL.md` |

### TypeScript
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `typescript-pro` | TS 3.12+ patterns, async, strict type safety | Any backend or UI type work | `.agents/skills/typescript-pro/SKILL.md` |
| `typescript-advanced-types` | Generics, conditional/mapped types, inference | Typing new API payloads and service interfaces | `.agents/skills/typescript-advanced-types/SKILL.md` |

### PostgreSQL / Database
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `postgres-best-practices` | Supabase-maintained Postgres performance rules (8 categories) | Reviewing any new query or index | `.agents/skills/postgres-best-practices/SKILL.md` |
| `postgresql` | Postgres-specific schema design, data types, indexing | Adding a new table (e.g. `point_exchange_rates`) | `.agents/skills/postgresql/SKILL.md` |
| `sql-optimization-patterns` | Turning slow queries into fast ones, index strategy | A query is slow, or before adding a heavy aggregation | `.agents/skills/sql-optimization-patterns/SKILL.md` |
| `database-migrations-sql-migrations` | Zero-downtime SQL migrations with rollback plans | Writing `DB/migrations/NNN_*.sql` | `.agents/skills/database-migrations-sql-migrations/SKILL.md` |

### SaaS / Multi-tenancy
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `saas-multi-tenant` | Multi-tenant architecture, tenant-scoped queries, RLS, safe cross-tenant admin patterns | **The most important skill for this repo.** Any tenant-scoped query, and Phase 3+ cross-tenant work | `.agents/skills/saas-multi-tenant/SKILL.md` |

### API Design
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `api-design-principles` | REST/GraphQL design principles, versioning, pagination | Adding a new endpoint family | `.agents/skills/api-design-principles/SKILL.md` |
| `api-endpoint-builder` | Production REST endpoints: validation, errors, auth, docs | Building any new route | `.agents/skills/api-endpoint-builder/SKILL.md` |
| `openapi-spec-generation` | OpenAPI 3.1 spec generation and validation | The API is documented with `swagger-jsdoc` — keep it in sync | `.agents/skills/openapi-spec-generation/SKILL.md` |
| `api-security-best-practices` | AuthN/AuthZ, input validation, rate limiting, abuse prevention | Reviewing a new endpoint against §4.5 | `.agents/skills/api-security-best-practices/SKILL.md` |

### Security
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `007` | Security audit, hardening, STRIDE/PASTA threat modelling, OWASP checks | Auditing the gaps in §5.2 | `.agents/skills/007/SKILL.md` |
| `backend-security-coder` | Secure backend coding: input validation, auth, API security | Writing a controller/service that touches auth or input | `.agents/skills/backend-security-coder/SKILL.md` |
| `auth-implementation-patterns` | AuthN/AuthZ patterns, sessions, tokens | Extending JWT/OTP/refresh, or Phase 5 identity linking | `.agents/skills/auth-implementation-patterns/SKILL.md` |
| `threat-modeling-expert` | STRIDE/PASTA, attack trees, security requirements | Before Phase 3/4 (money moves across tenants) | `.agents/skills/threat-modeling-expert/SKILL.md` |
| `security-bluebook-builder` | Minimal, real security policy with MUST/SHOULD language | Codifying the §4.5 rules into a team policy | `.agents/skills/security-bluebook-builder/SKILL.md` |

### Testing & QA
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `tdd-workflow` | RED → GREEN → REFACTOR discipline | Any new backend behaviour | `.agents/skills/tdd-workflow/SKILL.md` |
| `javascript-testing-patterns` | Testing strategy and patterns for TS/JS | Extending the vitest suite | `.agents/skills/javascript-testing-patterns/SKILL.md` |
| `unit-testing-test-generate` | Generates maintainable unit tests with edge-case focus | Writing tests for new pure functions | `.agents/skills/unit-testing-test-generate/SKILL.md` |
| `webapp-testing` | Playwright scripts against a running local app | E2E verification of the customer PWA or admin flows | `.agents/skills/webapp-testing/SKILL.md` |

### Performance
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `performance-engineer` | Profiling, observability, bottleneck analysis | The API is slow for a specific tenant or endpoint | `.agents/skills/performance-engineer/SKILL.md` |
| `web-performance-optimization` | Bundle size, loading, Core Web Vitals, runtime perf | The UI ships a PWA with a service worker and `motion` animations | `.agents/skills/web-performance-optimization/SKILL.md` |
| `k6-load-testing` | Load/scale test scenarios for APIs | Validating Phase 4 settlement throughput | `.agents/skills/k6-load-testing/SKILL.md` |

### UI/UX
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `product-design` | Design systems, UX flows, accessibility, visual language | New customer-facing surface (e.g. network linking in Phase 5) | `.agents/skills/product-design/SKILL.md` |
| `kpi-dashboard-design` | KPI dashboard and chart design | Admin/SuperAdmin analytics (`recharts` is already a dependency) | `.agents/skills/kpi-dashboard-design/SKILL.md` |
| `accessibility-compliance-accessibility-audit` | WCAG audit and remediation | Before shipping a customer-facing change | `.agents/skills/accessibility-compliance-accessibility-audit/SKILL.md` |
| `better-interface` | Reviews a screen, flow or whole interface across accessibility, layout, writing, typography, colour and polish → one ranked report | The **single entry point** for a full UI review — start here for any screen | `.agents/skills/better-interface/SKILL.md` |
| `interface-review` | Reviews a branch, PR or uncommitted change for the interface problems it introduced | Reviewing a UI diff before merge | `.agents/skills/interface-review/SKILL.md` |
| `better-ui` | Polishes surfaces, icons and motion with exact values (radius, optical alignment, shadows, icon states, animation) | The "final polish" pass on a component | `.agents/skills/better-ui/SKILL.md` |
| `better-colors` | Builds and checks colour systems — palettes, **semantic token naming**, format conversion, contrast measurement | The token system is in `theme/tokens.css`; extend it, never hardcode hex | `.agents/skills/better-colors/SKILL.md` |
| `better-typography` | Type scale, spacing, font features, wrapping, truncation, punctuation | `--text-xs..--text-3xl` live in `theme/tokens.css`; audit the scale before adding sizes | `.agents/skills/better-typography/SKILL.md` |
| `better-layout` | Grouping, alignment, reading order, responsive structure, **room for translated text** | RTL-first Arabic UI — mirrored/resized layout must still hold | `.agents/skills/better-layout/SKILL.md` |
| `better-accessibility` | Keyboard/focus behaviour, ARIA, accessible names, forms, screen-reader announcements, **motion and zoom** vs WCAG 2.2 | The project has **no** `prefers-reduced-motion` support — start here | `.agents/skills/better-accessibility/SKILL.md` |
| `better-writing` | Interface copy — labels, errors, empty states, confirmations | New strings belong in `services/translations.ts`, not inline | `.agents/skills/better-writing/SKILL.md` |
| `build-design` | Builds UI from a Figma file or a design image using the project's existing tokens | Implementing a design handed over as an image | `.agents/skills/build-design/SKILL.md` |
| `variant` | Builds multiple variants of a component to compare and pick one | Choosing between two visual directions | `.agents/skills/variant/SKILL.md` |
| `state-machine` | Renders **every state** of a component on a throwaway page with mock data | `Modal` / `BottomSheet` / `Toast` / `OtpInput` all have untested states | `.agents/skills/state-machine/SKILL.md` |
| `break` | Renders a component under every scenario that can reach it on a temporary page | Stress-testing a component against bad data | `.agents/skills/break/SKILL.md` |
| `explain-interface` | Explains how a site, visual effect or animation was built, from a URL or screenshot | Understanding a reference implementation | `.agents/skills/explain-interface/SKILL.md` |
| `afk` | Works through the project unattended, finding improvements and building the best version | Long autonomous polish passes | `.agents/skills/afk/SKILL.md` |
| `impeccable` | **Full design-director skill** (v4.9.1) with a CLI launcher: `init` → PRODUCT.md, `document` → DESIGN.md, `extract` → design-system tokens, `critique`, `audit`, `polish`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `optimize`, `live`, `hooks` | The umbrella for any UI work. Modes: **Operate** (admin, customer app) — not Persuade. On Windows use `.agents/skills/impeccable/scripts/impeccable.cmd` | `.agents/skills/impeccable/SKILL.md` |
| `uxui-evaluator` | Evaluates interface descriptions against **195** research-backed UX/UI principles | The principle-based evaluation pass (API key optional; enriched output needs uxuiprinciples.com access) | `.agents/skills/uxui-evaluator/SKILL.md` |
| `interface-auditor` | Detects UX antipatterns ("smells") with matched symptoms, severity and remediation recipes | Finding smells in a screen description | `.agents/skills/interface-auditor/SKILL.md` |
| `vibe-coding-advisor` | Injects the relevant UX principles into the session **before** generating a component | Mapping a component type (form, table, dashboard, nav) to the principles that apply | `.agents/skills/vibe-coding-advisor/SKILL.md` |
| `flow-checker` | Preflight/postflight checklists for onboarding, forms, pricing, dashboards, empty states | Checking a flow before shipping (needs uxuiprinciples.com **pro** access) | `.agents/skills/flow-checker/SKILL.md` |
| `ai-interface-reviewer` | Audits AI-powered interfaces against 44 AI-era principles | **Not applicable** — there is no AI surface in this product | `.agents/skills/ai-interface-reviewer/SKILL.md` |

### Animation — Motion (official) and GSAP (official)
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `motion` | **Official Motion (ex-Framer Motion) skill**: React/Vue/vanilla best practices, CSS spring generation, MotionScore perf audits with a Performance Doctor, transition editor, docs search | **The animation skill for this project** — `motion/react` is already the only animation library in the codebase | `.agents/skills/motion/SKILL.md` |
| `gsap-core` | Official GSAP core: tweens, easing, stagger, `gsap.matchMedia()` | Only if GSAP is actually added as a dependency (it is **not** today) | `.agents/skills/gsap-core/SKILL.md` |
| `gsap-react` | Official GSAP for React: `useGSAP`, refs, `gsap.context()`, cleanup | Same — only after GSAP is added | `.agents/skills/gsap-react/SKILL.md` |
| `gsap-performance` | Official GSAP perf: transforms, no layout thrash, `will-change`, batching | Same — only after GSAP is added | `.agents/skills/gsap-performance/SKILL.md` |
| `gsap-timeline` | Official GSAP timelines: sequencing, position parameter, nesting | Only if a marketing/landing page with scroll choreography is built | `.agents/skills/gsap-timeline/SKILL.md` |
| `gsap-scrolltrigger` | Official GSAP ScrollTrigger: scroll-linked animation, pinning, scrub | Only for scroll-driven pages — the customer PWA is a bottom-nav app, **not** scroll-driven | `.agents/skills/gsap-scrolltrigger/SKILL.md` |
| `gsap-plugins` | Official GSAP plugins: ScrollTo, Flip, Draggable, SplitText, CustomEase | Only after GSAP is added | `.agents/skills/gsap-plugins/SKILL.md` |
| `gsap-utils` | Official `gsap.utils`: clamp, mapRange, interpolate, snap, wrap | Only after GSAP is added | `.agents/skills/gsap-utils/SKILL.md` |
| `gsap-frameworks` | Official GSAP for Vue/Svelte/non-React | **Not applicable** — this project is React only | `.agents/skills/gsap-frameworks/SKILL.md` |

### DevOps
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `docker-expert` | Container build, multi-stage, hardening, orchestration | Changing `backend/Dockerfile` or `docker-compose.yml` | `.agents/skills/docker-expert/SKILL.md` |
| `devops-deploy` | Docker, CI/CD, IaC, monitoring | Deploying or adding CI | `.agents/skills/devops-deploy/SKILL.md` |
| `github-actions-templates` | Ready-made GitHub Actions workflows | **The repo has no CI** — this is the template to start from | `.agents/skills/github-actions-templates/SKILL.md` |
| `cicd-automation-workflow-automate` | CI/CD workflow design and quality gates | Designing the build → test → deploy pipeline | `.agents/skills/cicd-automation-workflow-automate/SKILL.md` |
| `observability-engineer` | Logging, metrics, tracing, SLI/SLO | Extending the Winston logger beyond request logs | `.agents/skills/observability-engineer/SKILL.md` |
| `slo-implementation` | SLIs, SLOs, error budgets | Defining reliability targets for the loyalty API | `.agents/skills/slo-implementation/SKILL.md` |

### Workflow, Quality & Agent Process
| Skill | What it does | Use it when | Path |
|---|---|---|---|
| `phase-gated-debugging` | 5-phase protocol; no code edits before root cause is confirmed | Debugging anything in this phased repo | `.agents/skills/phase-gated-debugging/SKILL.md` |
| `systematic-debugging` | Evidence-driven debugging | Any unexpected behaviour | `.agents/skills/systematic-debugging/SKILL.md` |
| `verification-before-completion` | Requires proof before claiming "done" | Before reporting any task complete | `.agents/skills/verification-before-completion/SKILL.md` |
| `lint-and-validate` | Run the project's validation tools after every change | Every code change | `.agents/skills/lint-and-validate/SKILL.md` |
| `code-review-checklist` | Functional, security, performance, maintainability review | Reviewing your own or someone else's diff | `.agents/skills/code-review-checklist/SKILL.md` |
| `code-reviewer` | AI code review specialist | Structured review pass before merge | `.agents/skills/code-reviewer/SKILL.md` |
| `clean-code` / `uncle-bob-craft` | Clean-code principles, design smells | While refactoring — not for wholesale rewrites | `.agents/skills/clean-code/SKILL.md`, `.agents/skills/uncle-bob-craft/SKILL.md` |
| `writing-plans` / `plan-writing` | Structured, dependency-aware plans with verification criteria | Planning a phase before coding | `.agents/skills/writing-plans/SKILL.md`, `.agents/skills/plan-writing/SKILL.md` |
| `mock-hunter` | Audits a page for mock data, hardcoded values, broken endpoints | **The customer app currently falls back to mock data** — use this to find every occurrence | `.agents/skills/mock-hunter/SKILL.md` |
| `production-audit` | Production-readiness gaps: RLS, webhooks, secrets, idempotency, deployment | Pre-release readiness check | `.agents/skills/production-audit/SKILL.md` |
| `vibe-code-auditor` | Structural flaws and fragility in AI-generated code | Auditing a freshly generated phase | `.agents/skills/vibe-code-auditor/SKILL.md` |
| `technical-change-tracker` | Structured change records and state machine | Long multi-phase work spanning sessions | `.agents/skills/technical-change-tracker/SKILL.md` |
| `commit` / `pr-writer` | Conventional commits; PR descriptions | Shipping a phase | `.agents/skills/commit/SKILL.md`, `.agents/skills/pr-writer/SKILL.md` |
| `agents-md` | Keep `AGENTS.md` concise and high-signal | Updating this file | `.agents/skills/agents-md/SKILL.md` |
| `project-skill-audit` | Audits the project against recurring workflows and proposes skill updates | Periodically re-tuning the skill selection | `.agents/skills/project-skill-audit/SKILL.md` |
| `skill-router` / `manage-skills` / `skill-installer` | Discover, install, toggle and organise skills | Managing `.agents/skills/` | `.agents/skills/skill-router/SKILL.md`, `.agents/skills/manage-skills/SKILL.md`, `.agents/skills/skill-installer/SKILL.md` |

---

## 7. Skill → Task quick map

| I am about to… | Load first |
|---|---|
| Write a DB migration | `database-migrations-sql-migrations`, `postgresql` |
| Add or change a tenant-scoped query | `saas-multi-tenant`, `postgres-best-practices` |
| Add an endpoint | `api-endpoint-builder`, `api-design-principles`, `zod-validation-expert` |
| Touch auth / roles / OTP | `auth-implementation-patterns`, `backend-security-coder`, `007` |
| Write points / expiry / settlement logic | `tdd-workflow`, `event-sourcing-architect`, `saga-orchestration` |
| Change the BullMQ worker or add a job | `bullmq-specialist` |
| Build a customer-facing screen | `mobile-design`, `react-ui-patterns`, `i18n-localization`, `product-design` |
| Animate anything (Motion / CSS) | `motion` — the official skill; `motion/react` is the only animation library in this repo |
| Audit or fix animation performance | `motion` (MotionScore + Performance Doctor), `better-ui`, `better-accessibility` |
| Review a whole screen or flow | `better-interface` (one ranked report) → then `better-ui` / `better-layout` / `better-writing` as needed |
| Review a UI diff before merge | `interface-review` |
| Work on colours / type / layout | `better-colors`, `better-typography`, `better-layout` |
| Enumerate every state of a component | `state-machine`, `break` |
| Run a full design pass on a screen | `impeccable` (umbrella) → `polish` / `critique` / `audit` / `harden`; or `better-interface` for the ranked report |
| Get UX principles into the session before coding | `vibe-coding-advisor`, then `uxui-evaluator` / `interface-auditor` |
| Touch the admin dashboards | `react-component-performance`, `react-best-practices` |
| Add charts / analytics | `kpi-dashboard-design` |
| Set up CI or deployment | `github-actions-templates`, `docker-expert`, `devops-deploy` |
| Something is broken | `phase-gated-debugging`, `systematic-debugging` |
| Before saying "done" | `verification-before-completion`, `lint-and-validate` |

---

## 8. Roadmap context (not yet built)

Phases 2–5 of the cross-tenant loyalty network are **plans, not code**. Treat them as requirements, not as existing features.

| Phase | Planned artefacts | Existing foundation to build on |
|---|---|---|
| 2 — Exchange rates | `point_exchange_rates` table (**does not exist yet**), rate service/controller, tenant rate UI | `tenants.points_per_egp`, `networks`, `network_memberships` |
| 3 — Cross-tenant ledger | `network_points_ledger`, `cross_tenant_redemptions`, network-wide balance | `wallet_ledger` + `LedgerService` + `idempotency_key` |
| 4 — Settlements | `settlements`, `settlement_items`, dual settlement (bank transfer / subscription deduction) | `subscriptions`, `billing_history`, BullMQ |
| 5 — Network customers | `network_customers`, `network_customer_links`, OTP-based identity linking | `otp_codes`, `customers` (phone unique **per tenant**) |

---

*Last verified against the codebase: 2026-11-15. If code and this file disagree, the code is authoritative — update this file.*
