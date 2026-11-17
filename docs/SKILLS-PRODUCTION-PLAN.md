# MO2 Loyalty — Skills Plan for the Production Roadmap

> **Companion to:** `AGENTS.md` (project rules) and the commercial PDF (`mo2-loyalty-report.pdf`, 6 pages).
> **Purpose:** the definitive list of skills to load, per roadmap phase (P0–P5), for the work described in the production-readiness plan.
> **Library:** `G:\development\Loyality Project\.agents\skills\<name>\SKILL.md` — local only, **not** in git (`.gitignore` → `.agents/`). Never copy a skill into the repo; reference it by path.
> **Rule:** load a skill when you are about to *do* the thing it covers — not because it is listed. If a skill is missing from a phase, do the work without it rather than inventing one.

---

## 1. Coverage matrix — what the PDF promises vs. what the code does

Verified against the code on 2026-11-15. **Status legend:** ✅ built · 🟡 partial · ❌ missing.

### Page 3 — The customer journey

| PDF promise | Code status | Evidence | Phase |
|---|---|---|---|
| **1. Scan** — customer scans a QR at the till, no app download | 🟡 **QR rendering exists, the QR *artwork* doesn't.** `PointsWallet.tsx` renders the customer's phone QR via the `qrcode` npm package; `RedemptionCode.tsx` renders the redemption QR via a `qrcode-generator` CDN global loaded in `index.html`. But there is **no QR per table / till / branch** and **no `tables` concept** — nothing produces the "scan to join" link | `UI/src/components/loyalty/PointsWallet.tsx:11`, `UI/src/components/loyalty/RedemptionCode.tsx:27`, `DB/schema.sql` (no tables entity) | **P3** |
| **2. Earn** — points post automatically against every order | ✅ | `backend/src/services/webhookProcessor.ts` → `LoyaltyService.earnPoints` | — |
| **3. Redeem** — one tap at the till, points deduct instantly | ✅ | `loyaltyController.cashierProcessRedemption` + `LoyaltyService.redeemReward` (`FOR UPDATE` lock) | — |
| **4. Understand** — repeat-visit rate, top customers, busiest hours, reward performance, **drill into a single branch** | ❌ **Missing.** Admin exposes only `GET /stats` (4 counters: total/active customers, points this month, redemptions today) and `GET /stats/chart` (6-month points trend). No repeat-visit rate, no hour-of-day histogram, no top-customers ranking, no per-reward performance, no branch filter | `backend/src/controllers/adminController.ts:22` and `:418` | **P3** |
| "Multi-branch owners see it all in one place, or drill into a single branch" | 🟡 data exists, **UI/query doesn't**. `transactions.branch_id` and `redemptions.branch_id` are already populated — drill-down is mostly a query problem, not a schema problem | `backend/src/services/loyalty.ts:79,193` | **P3** |

### Page 5 — What's under the hood

| PDF promise | Code status | Evidence | Phase |
|---|---|---|---|
| Points wallet: earn, redeem, refund, adjust — **every movement logged and reversible** | 🟡 **Reversal + audit log exist** (`ledger_type 'reversal'`, `admin_activity_log`, `adjustPoints` refusing to go below zero). **But** `adminEarnPointsManual` inserts straight into `wallet_ledger`, bypassing `LedgerService` → no `idempotency_key` | `backend/src/controllers/loyaltyController.ts` (manual earn), `DB/migrations/009` | **P1** (remote Phase 2 fixes it) |
| Multi-branch, one account | 🟡 branches + `branch_users` + cashier branch binding exist; no cross-branch rollup view | `DB/migrations/010_branch_users.sql` | **P3** (analytics) |
| Live retention numbers (repeat-visit rate, top customers, busiest hours) | ❌ same gap as the dashboard above | — | **P3** |
| POS-ready — webhooks queue safely if the connection drops | ✅ | `backend/src/services/webhookProcessor.ts` (BullMQ, 5 attempts, exponential backoff) | — |
| **Cross-brand networks** — customers earn and redeem across brands | 🟡 **Phase 1 only** (`networks`, `network_memberships`, CRUD, UI tab). Exchange rates, shared ledger, settlements and cross-brand identity are **not built** — and `point_exchange_rates` **does not exist in the DB at all** | `DB/migrations/007`, `backend/src/services/network.ts` | **P1** (Phase 2/3 from remote) → then roadmap Phases 2–5 |
| OTP-secured wallets — rate-limited, time-boxed, no passwords to leak | 🟡 rate limiting + time-boxed OTP + atomic consume are in place. **But**: codes are generated with `Math.random()` (not `crypto`), the code is written to the log when SMS fails, and the SMS env names in `backend/.env` (`SMS_USERNAME`) don't match the code (`VICTORYLINK_USERNAME`) → **SMS never actually sends** | `backend/src/services/otp.ts`, `backend/.env` | **P1** (remote Phase 2 hashes OTPs) + **P2** (env + provider) |
| Getting started: branch setup, **QR codes**, staff walkthrough, go live | ❌ **QR generation per branch/table is the missing piece** — it is step 1 of the PDF's own onboarding | — | **P3** |

### PDF claims that are marketing, not engineering
Page 2 (`68%`, `5x`, `12 wks`) and the closing CTA carry no code requirement — but if you want to substantiate them for the pilot, the P3 retention analytics are the source of truth.

---

## 2. Skills by phase

Load only what the task needs. Each entry: **what it gives you → which concrete work item it serves**.

### P0 — Clean and restructure the local repo

| Skill | Serves | Path |
|---|---|---|
| `git-advanced-workflows` | Recovering from the force-pushed `origin/main`; rewriting the local branch without losing the 17 local commits | `.agents/skills/git-advanced-workflows/SKILL.md` |
| `using-git-worktrees` | Isolating the P0/P1 cleanup so the working tree stays usable | `.agents/skills/using-git-worktrees/SKILL.md` |
| `codebase-audit-pre-push` | The P0 sweep itself — junk files, dead code, secrets, optimisation issues before anything is pushed | `.agents/skills/codebase-audit-pre-push/SKILL.md` |
| `file-organizer` | Moving `extracted_brd*.txt`, `temp-tenant.json`, `install-services.ps1`, `session-summary.md`, `phases explain/` out of the root into `docs/` | `.agents/skills/file-organizer/SKILL.md` |
| `documentation-templates` | Building the `docs/` folder structure (architecture, runbook, data model) | `.agents/skills/documentation-templates/SKILL.md` |
| `readme` | The repo `README.md` (currently 30 bytes) | `.agents/skills/readme/SKILL.md` |
| `commit` | Conventional commits for the P0 restructure | `.agents/skills/commit/SKILL.md` |
| `git-pushing` | Staging → commit → push safely once the history is repaired | `.agents/skills/git-pushing/SKILL.md` |

**P0 also fixes (no skill needed, just do them):** untrack `.agents/` (4 479 files), remove `package-lock.json` from `.gitignore`, rename `UI/package.json` `react-example` → `@mo2/loyalty-ui`, replace the `rm -rf` `clean` script with a Windows-safe one, drop the `*.metadata.json` artifacts from the remote branch.

---

### P1 — Port Phase 2/3 from `origin/main` into the right paths

> The remote branch is **flattened**: `migrationRunner.ts`, `outbox.ts`, `phase2.test.ts`, `012_*.sql` etc. sit at the repo root instead of `backend/src/…` and `DB/migrations/…`. This phase is a **port + verify**, not a rewrite.

| Skill | Serves | Path |
|---|---|---|
| `orchestrate-batch-refactor` | Planning the flatten→place migration as dependency-aware work packets | `.agents/skills/orchestrate-batch-refactor/SKILL.md` |
| `code-refactoring-tech-debt` | Placing each remote file in the correct module without breaking the 4-layer split | `.agents/skills/code-refactoring-tech-debt/SKILL.md` |
| `database-migrations-sql-migrations` | Renumbering `010_pos_integrations` → `011+` so it does not collide with local `010_branch_users.sql`; writing them with rollback plans | `.agents/skills/database-migrations-sql-migrations/SKILL.md` |
| `postgres-best-practices` | The remote `012` adds `idx_webhook_logs_provider_event` and `rewards.current_redemptions` — verifying the indexes are right | `.agents/skills/postgres-best-practices/SKILL.md` |
| `saas-multi-tenant` | The remote endpoints (cashier branch authorization, reconciliation) **must** stay tenant-scoped — this is the skill that prevents a cross-tenant leak | `.agents/skills/saas-multi-tenant/SKILL.md` |
| `api-design-principles` | Reviewing the remote routes before they are merged (`healthRoutes.ts`, `outbox.ts`, `reconciliation.ts`) | `.agents/skills/api-design-principles/SKILL.md` |
| `zod-validation-expert` | Any new request validation in the ported endpoints | `.agents/skills/zod-validation-expert/SKILL.md` |
| `tdd-workflow` | The remote ships 4 acceptance suites (`phase2.test.ts`, `phase3.test.ts`, `webhook.test.ts`, `loyalty.test.ts`) — they define the contract | `.agents/skills/tdd-workflow/SKILL.md` |
| `test-fixing` | Getting those 4 suites green against the local DB | `.agents/skills/test-fixing/SKILL.md` |
| `lint-and-validate` | Running `npm run build` + `npm test` after every ported file | `.agents/skills/lint-and-validate/SKILL.md` |
| `phase-gated-debugging` | Root-cause before editing — the right discipline for a port that touches auth and money | `.agents/skills/phase-gated-debugging/SKILL.md` |
| `systematic-debugging` | When a ported test fails for a non-obvious reason | `.agents/skills/systematic-debugging/SKILL.md` |

**What P1 actually buys you** (the remote tests are the spec):
- `phase2.test.ts` → manual grants go through `LedgerService`; OTP stored as SHA-256; `max_redemptions` enforced under concurrency; cashier blocked from acting on another branch.
- `phase3.test.ts` → transactional outbox (`outbox_events`) + reconciliation job that detects missing/mismatched ledger rows.
- `webhook.test.ts` → **fail-closed 403** when no integration secret exists in production; `timingSafeEqual` HMAC; tenant-A secret rejected on tenant-B URL.
- `loyalty.test.ts` → refunds use the `reversal` type and land at balance 0; redemption blocked for unverified customers.

**Migration collision to resolve:** local has `010_branch_users.sql`; remote has `010_pos_integrations.sql` → remote becomes `011_pos_integrations.sql`, then `011→012`, `012→013`, `013→014`.

---

### P2 — Hardening and security

| Skill | Serves | Path |
|---|---|---|
| `007` | OWASP / STRIDE audit of the whole app; close the §5.2 gaps in `AGENTS.md` | `.agents/skills/007/SKILL.md` |
| `backend-security-coder` | The concrete fixes: role guards on `/api/tenants`, `requireSubscription` where missing, removing the `role: 'owner'` option from public registration | `.agents/skills/backend-security-coder/SKILL.md` |
| `api-security-best-practices` | Per-endpoint review against `AGENTS.md` §4.5 | `.agents/skills/api-security-best-practices/SKILL.md` |
| `auth-implementation-patterns` | Removing the hardcoded default JWT secret, separating access/refresh properly, `crypto`-based OTP | `.agents/skills/auth-implementation-patterns/SKILL.md` |
| `threat-modeling-expert` | Modelling the cross-tenant money flows before roadmap Phase 3/4 | `.agents/skills/threat-modeling-expert/SKILL.md` |
| `secrets-management` | Real secret handling for the deploy (vault / CI secrets), not `docker-compose` defaults | `.agents/skills/secrets-management/SKILL.md` |
| `sast-configuration` | Standing up SAST in CI | `.agents/skills/sast-configuration/SKILL.md` |
| `semgrep-rule-creator` | Custom rules for this codebase's invariants: *every tenant query filters `tenant_id`*, *every ledger write passes an idempotency key* | `.agents/skills/semgrep-rule-creator/SKILL.md` |
| `observability-engineer` | The remote `correlation.ts` + `healthRoutes.ts` — turning them into a real request-correlation + health story | `.agents/skills/observability-engineer/SKILL.md` |
| `distributed-tracing` | Tracing a request through Express → BullMQ → DB | `.agents/skills/distributed-tracing/SKILL.md` |

**Also in P2 (no skill needed):** fix the `SMS_USERNAME` → `VICTORYLINK_USERNAME` env-name mismatch, wire a real SMS provider, remove the `Math.random()` OTP and the code-in-logs path, drop the hardcoded Postgres password from `docker-compose.yml`.

---

### P3 — Close the PDF gaps: analytics + QR

> **Two separate workstreams:** *analytics* (backend queries + dashboard) and *polish* (the UI already exists but has quality gaps). They can run in parallel.

#### P3a — Analytics & QR (feature work)

| Skill | Serves | Path |
|---|---|---|
| `kpi-dashboard-design` | The retention dashboard the PDF promises: repeat-visit rate, top customers, busiest hours, reward performance — `recharts` is already a dependency | `.agents/skills/kpi-dashboard-design/SKILL.md` |
| `sql-optimization-patterns` | Writing the heavy analytics queries (hour-of-day histogram, repeat-visit cohorts, per-reward ranking) without wrecking latency | `.agents/skills/sql-optimization-patterns/SKILL.md` |
| `postgres-best-practices` | Indexes for `transactions.branch_id` / `redemptions.branch_id` / `created_at` so the drill-down is fast | `.agents/skills/postgres-best-practices/SKILL.md` |
| `react-ui-patterns` | Loading / empty / error states for every chart panel | `.agents/skills/react-ui-patterns/SKILL.md` |
| `react-component-performance` | The dashboard lives next to `AdminDashboard.tsx` (76 KB) — keep the render cost down | `.agents/skills/react-component-performance/SKILL.md` |
| `react-best-practices` | Any new dashboard component | `.agents/skills/react-best-practices/SKILL.md` |
| `product-design` | The drill-down UX (tenant → branch → day) and the QR-onboarding flow | `.agents/skills/product-design/SKILL.md` |
| `frontend-design` | The printable **branch/table QR sheet** (the PDF's onboarding step 1) | `.agents/skills/frontend-design/SKILL.md` |
| `design-taste-frontend` | Polishing the QR sheet and the analytics panels so they match the existing premium admin theme | `.agents/skills/design-taste-frontend/SKILL.md` |
| `i18n-localization` | Every new label goes through `translations.ts` — not hardcoded Arabic (the existing anti-pattern) | `.agents/skills/i18n-localization/SKILL.md` |

#### P3b — Interface & motion polish (quality work)

Installed specifically for this phase. Each one has a concrete, verified defect behind it:

| Skill | Serves | Path |
|---|---|---|
| `motion` | **Official Motion skill** — the project's only animation library (`motion/react`, 15+ components). Carries React best practices, CSS spring generation, and a **MotionScore performance audit** | `.agents/skills/motion/SKILL.md` |
| `better-interface` | The one-shot review of a screen across a11y → layout → writing → typography → colour → polish, ranked. **Start here** for the admin and customer shells | `.agents/skills/better-interface/SKILL.md` |
| `interface-review` | Reviewing a UI diff before merge (catches problems a PR introduced) | `.agents/skills/interface-review/SKILL.md` |
| `better-ui` | Final polish pass with exact values: radius, optical alignment, shadows, icon states, animation | `.agents/skills/better-ui/SKILL.md` |
| `better-accessibility` | Keyboard/focus, ARIA, accessible names, **and motion/zoom vs WCAG 2.2** | `.agents/skills/better-accessibility/SKILL.md` |
| `better-typography` | Type scale, font loading, wrapping, truncation, punctuation | `.agents/skills/better-typography/SKILL.md` |
| `better-colors` | Semantic token naming, palette generation, contrast measurement | `.agents/skills/better-colors/SKILL.md` |
| `better-layout` | Grouping, alignment, reading order, **room for translated text** — the UI is RTL-first Arabic | `.agents/skills/better-layout/SKILL.md` |
| `better-writing` | Labels, errors, empty states, confirmations | `.agents/skills/better-writing/SKILL.md` |
| `state-machine` | Render **every state** of `Modal` / `BottomSheet` / `Toast` / `OtpInput` on a throwaway page | `.agents/skills/state-machine/SKILL.md` |
| `break` | Render a component under every scenario that can reach it | `.agents/skills/break/SKILL.md` |
| `variant` | Build side-by-side variants before committing to one visual direction | `.agents/skills/variant/SKILL.md` |
| `build-design` | Implement a design handed over as an image, using the project's tokens | `.agents/skills/build-design/SKILL.md` |
| `afk` | Long autonomous polish passes over the whole UI | `.agents/skills/afk/SKILL.md` |
| `impeccable` | **The design-director umbrella** (v4.9.1) with a CLI launcher: `init`→PRODUCT.md, `document`→DESIGN.md, `extract`→design-system tokens, `critique`, `audit`, `polish` (= final polish), `harden` (= errors/i18n/edge cases), `onboard` (= empty states), `animate`, `colorize`, `typeset`, `layout`, `optimize`, `live`, `hooks` | This project is in **Operate** mode (admin + customer app), not Persuade. On Windows run `.agents/skills/impeccable/scripts/impeccable.cmd` | `.agents/skills/impeccable/SKILL.md` |
| `uxui-evaluator` | Evaluates an interface against 195 research-backed UX/UI principles, with severity + business impact | The principle-based evaluation pass (API key optional; enriched output needs uxuiprinciples.com access) | `.agents/skills/uxui-evaluator/SKILL.md` |
| `interface-auditor` | Detects UX antipatterns ("smells") — matched symptoms, severity, step-by-step remediation | Finding smells in a screen description | `.agents/skills/interface-auditor/SKILL.md` |
| `vibe-coding-advisor` | Injects the relevant UX principles into the session **before** a component is generated | Map component type (form, table, dashboard, nav) → the principles that apply | `.agents/skills/vibe-coding-advisor/SKILL.md` |
| `flow-checker` | Preflight/postflight checklists for onboarding, forms, pricing, dashboards, empty states | Checking a flow before shipping (needs uxuiprinciples.com **pro** access) | `.agents/skills/flow-checker/SKILL.md` |
| `ai-interface-reviewer` | Audits AI-powered interfaces against 44 AI-era principles | **Not applicable** — no AI surface in this product | `.agents/skills/ai-interface-reviewer/SKILL.md` |

**GSAP (`gsap-core`, `gsap-react`, `gsap-performance`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-frameworks`)** — installed, but **GSAP is not a dependency of this project**. They only become relevant if you deliberately add GSAP, and even then only for scroll-driven or timeline-choreographed work. The customer PWA is a bottom-nav tab app and the admin is data-dense; `motion` covers the actual animation surface. `gsap-frameworks` (Vue/Svelte) is **not applicable at all** — this project is React-only.

**P3a schema decision (do this first):** you need a `tables` (or `branch_qr_codes`) entity for "every table and till has a QR code", and a way to link a scanned customer to the branch. Design it with `database-migrations-sql-migrations` **before** writing the endpoints, and remember to register it in `docker-compose.yml` (the recurring trap from `AGENTS.md` §4.3).

#### Verified defects these skills would catch (found 2026-11-15)

1. **No reduced-motion support anywhere.** The UI uses `AnimatePresence`, `whileTap`, spring transitions and `layoutId` in 15+ components, and there is **no** `prefers-reduced-motion` media query and **no** `<MotionConfig reducedMotion="user">` at the app root — which the official Motion React guide prescribes. That is a WCAG 2.3.3 gap. → `motion` + `better-accessibility`
2. **Fonts are loaded twice, from two different strategies.** `theme/fonts.css` pulls **Outfit + JetBrains Mono** from the Google Fonts CDN (`@import url(...)`, render-blocking), while `main.tsx` imports **Geist Variable + JetBrains Mono Variable** from `@fontsource-variable/*`. JetBrains Mono ends up loaded in two variants; Outfit comes only from the CDN. → `better-typography` + `web-performance-optimization`
3. **Two different QR implementations.** `PointsWallet.tsx` uses the `qrcode` npm package; `RedemptionCode.tsx` uses a `qrcode-generator` CDN global loaded in `index.html`. Pick one before building the branch/table QR sheet. → `frontend-design` + `code-review-checklist`
4. **Mixed CSS and Motion animation systems.** `AppLayout.tsx` mixes Tailwind `transition-colors` / `transition-transform` with Motion `layoutId`. The official `css-or-motion` matrix says this split is *correct* (CSS for simple colour/shadow changes, Motion for exits and shared-element moves) — so this is a keep, but document the rule.
5. **PWA service-worker conflict.** `public/sw.js` and `vite-plugin-pwa`'s generated worker coexist, `public/manifest.json` duplicates the generated manifest, and `main.tsx` unregisters every service worker on every page load — so the PWA is effectively disabled. → `progressive-web-app`

---

### P4 — CI/CD and deploy

| Skill | Serves | Path |
|---|---|---|
| `github-actions-templates` | There is **no** `.github/workflows` — this is the starting point for lint → test → build → migrate | `.agents/skills/github-actions-templates/SKILL.md` |
| `cicd-automation-workflow-automate` | Designing the pipeline gates (build gate, test gate, migration gate, deploy gate) | `.agents/skills/cicd-automation-workflow-automate/SKILL.md` |
| `docker-expert` | Production `Dockerfile` for the backend, multi-stage UI build, image hardening | `.agents/skills/docker-expert/SKILL.md` |
| `devops-deploy` | The deploy story end to end (compose → registry → host) | `.agents/skills/devops-deploy/SKILL.md` |
| `deployment-engineer` | Environment parity between dev, staging and production | `.agents/skills/deployment-engineer/SKILL.md` |
| `deployment-procedures` | Rollback and verification discipline — especially once migrations run automatically | `.agents/skills/deployment-procedures/SKILL.md` |
| `appdeploy` | Getting a public URL for the pilot | `.agents/skills/appdeploy/SKILL.md` |
| `production-audit` | The pre-ship gate: RLS/tenant scoping, webhooks, secrets, idempotency, deployment health | `.agents/skills/production-audit/SKILL.md` |
| `vibe-code-auditor` | Auditing the AI-generated Phase 2/3 code before it reaches production | `.agents/skills/vibe-code-auditor/SKILL.md` |
| `k6-load-testing` | Load profile for webhooks + redemption + settlement | `.agents/skills/k6-load-testing/SKILL.md` |

---

### P5 — Pilot with Aroma Cafe

| Skill | Serves | Path |
|---|---|---|
| `database` | A realistic seed: Aroma Cafe + branches, staff, customers, rewards, historical transactions so the analytics have something to show | `.agents/skills/database/SKILL.md` |
| `observability-monitoring-monitor-setup` | Dashboards and alerts for the pilot (webhook failures, queue depth, settlement errors) | `.agents/skills/observability-monitoring-monitor-setup/SKILL.md` |
| `incident-responder` | Being ready when the pilot breaks at the till | `.agents/skills/incident-responder/SKILL.md` |
| `postmortem-writing` | Turning pilot incidents into fixes | `.agents/skills/postmortem-writing/SKILL.md` |
| `on-call-handoff-patterns` | If more than one person is on the pilot | `.agents/skills/on-call-handoff-patterns/SKILL.md` |
| `internal-comms` | The PDF's "staff walkthrough" and go-live communication | `.agents/skills/internal-comms/SKILL.md` |
| `customer-support` | Handling end-customer issues during the pilot | `.agents/skills/customer-support/SKILL.md` |
| `webapp-testing` | Playwright E2E over the real pilot flows (scan → earn → redeem) | `.agents/skills/webapp-testing/SKILL.md` |

---

### Cross-cutting — load regardless of phase

| Skill | Serves | Path |
|---|---|---|
| `verification-before-completion` | **Before every "done" claim.** Non-negotiable in this repo | `.agents/skills/verification-before-completion/SKILL.md` |
| `lint-and-validate` | The gates: `backend: npm run build && npm test` · `UI: npm run lint` | `.agents/skills/lint-and-validate/SKILL.md` |
| `code-review-checklist` / `code-reviewer` | The pre-merge review of every phase | `.agents/skills/code-review-checklist/SKILL.md`, `.agents/skills/code-reviewer/SKILL.md` |
| `clean-code` | Refactoring discipline — without turning into a rewrite | `.agents/skills/clean-code/SKILL.md` |
| `writing-plans` / `plan-writing` | Planning a phase before touching code | `.agents/skills/writing-plans/SKILL.md`, `.agents/skills/plan-writing/SKILL.md` |
| `mock-hunter` | The customer app **still falls back to mock data** on API failure (`AppContext.tsx`: `sendOtp` returns `true`, `redeemReward` fabricates a code). Use this to find every occurrence before the pilot | `.agents/skills/mock-hunter/SKILL.md` |
| `progressive-web-app` | The service-worker conflict: `main.tsx` unregisters every SW on load, `public/sw.js` coexists with `vite-plugin-pwa`, and `public/manifest.json` duplicates the generated one | `.agents/skills/progressive-web-app/SKILL.md` |
| `skill-router` / `manage-skills` / `skill-installer` | Managing `.agents/skills/` | `.agents/skills/skill-router/SKILL.md`, `.agents/skills/manage-skills/SKILL.md`, `.agents/skills/skill-installer/SKILL.md` |
| `project-skill-audit` | Re-tuning this list after each phase lands | `.agents/skills/project-skill-audit/SKILL.md` |

---

## 3. Skill → task quick map

| I am about to… | Load first |
|---|---|
| Repair the force-pushed git history | `git-advanced-workflows`, `using-git-worktrees`, `git-pushing` |
| Sweep junk files out of the repo root | `codebase-audit-pre-push`, `file-organizer` |
| Write a migration (incl. the new QR/tables entity) | `database-migrations-sql-migrations`, `postgres-best-practices` |
| Port a file from `origin/main` | `orchestrate-batch-refactor`, `code-refactoring-tech-debt`, `phase-gated-debugging` |
| Get the 4 remote acceptance suites green | `tdd-workflow`, `test-fixing`, `lint-and-validate` |
| Add/change any tenant-scoped query | `saas-multi-tenant`, `postgres-best-practices` |
| Add an endpoint | `api-design-principles`, `api-endpoint-builder`, `zod-validation-expert` |
| Touch auth / roles / OTP / JWT | `auth-implementation-patterns`, `backend-security-coder`, `007` |
| Close a security gap | `007`, `api-security-best-practices`, `backend-security-coder` |
| Add a Semgrep rule for a project invariant | `semgrep-rule-creator`, `sast-configuration` |
| Build the retention dashboard | `kpi-dashboard-design`, `sql-optimization-patterns`, `react-ui-patterns` |
| Build the branch/table QR sheet | `frontend-design`, `product-design`, `design-taste-frontend` |
| Set up CI or deploy | `github-actions-templates`, `cicd-automation-workflow-automate`, `docker-expert` |
| Audit before shipping | `production-audit`, `vibe-code-auditor`, `k6-load-testing` |
| Seed realistic pilot data | `database` |
| Something is broken | `phase-gated-debugging`, `systematic-debugging` |
| Before saying "done" | `verification-before-completion`, `lint-and-validate` |

---

## 4. Deliberately excluded

Not chosen, with reasons — so nobody re-adds them by habit:

- **Frameworks not in this repo** — Angular, Vue, Next.js, Laravel, Django, Spring, .NET, Flutter, Swift, Unity, Rust, Go, PHP, Ruby. The stack is React 19 + Vite + Tailwind v4 + Express + raw SQL; a framework skill for an absent stack produces wrong advice.
- **LLM / AI skills** (langchain, rag-*, llm-*, agent-*) — there is no LLM in the product today. Revisit only if the roadmap adds an assistant feature.
- **Cloud-vendor skills** (azure-*, aws-*, gcp-*, terraform-*) — the deployment target is not decided. `docker-expert` + `devops-deploy` cover the current plan; add a vendor skill once the target is chosen.
- **Marketing / growth skills** (seo-*, social-*, ad-creative, cold-email, mailchimp-automation…) — irrelevant to the engineering phases. The PDF's marketing claims only need the P3 analytics to substantiate them.
- **Heavy enterprise suites** (mulesoft, mainframe, SAP, Salesforce, ServiceNow) — not in the product.
- **Agent-tooling skills** (mcp-builder, agent-orchestrator, multi-agent-*) — this project is built by agents, not *about* agents.

---

## 5. Phase gates

A phase is not done until its gate passes. Do not start the next phase on a red gate.

| Phase | Gate |
|---|---|
| **P0** | Repo root clean · `.agents/` untracked · `package-lock.json` committed · `docs/` exists · `README.md` real · history repaired and pushed |
| **P1** | All remote Phase 2/3 files placed in the correct paths · migrations renumbered `011+` and registered in `docker-compose.yml` · `backend: npm run build && npm test` green (incl. the 4 ported suites) · `UI: npm run lint` clean |
| **P2** | No hardcoded secrets · role guards on every privileged route · OTP via `crypto` and hashed · SMS provider actually delivers · SAST in CI |
| **P3** | Every PDF promise on pages 3–5 demonstrably works · repeat-visit rate, top customers, busiest hours, reward performance, branch drill-down live · branch/table QR sheet printable · new analytics indexed and explained |
| **P4** | CI green on a PR · image builds reproducibly · migrations run automatically and are reversible · rollback rehearsed · `k6` numbers recorded |
| **P5** | Seeded realistic data · monitoring + alerts live · on-call path documented · staff walkthrough delivered · pilot metrics visible on the dashboard |

---

*Skills verified present on 2026-11-15. Re-verify with `project-skill-audit` after each phase.*
