# MO2 Loyalty Platform — Session Summary

## Goal
Design and implement a cross-tenant loyalty network layer on top of the existing MO2 Loyalty Platform, enabling shared points ledger, cross-tenant redemption, settlement between tenants, and unified customer identity across a network.

## Constraints & Preferences
- Project is a multi-tenant loyalty SaaS (Node.js/Express/TypeScript backend, PostgreSQL, Redis, React/TypeScript UI)
- Architecture changes must be additive — not break existing per-tenant isolation
- User communicates in Arabic; code/technical output in English
- Tenant can belong to **multiple networks** (not just one)
- Exchange rates are **negotiated between tenants** (both Tenant A and B set their rates)
- Settlement supports **both** manual bank transfer and subscription deduction
- Customer identity linking uses **mobile + OTP verification**
- Implementation divided into **separate phases** — user requested: start Phase 1, refactor after each phase, and add tests

## Progress
### Done
- Explored full project structure: backend, UI, DB
- Identified current schema, auth, routes, controllers, services, UI pages
- Created comprehensive 5-phase implementation plan; user confirmed all design choices
- **Phase 1 Backend — COMPLETE:**
  - Created migration `DB/migrations/007_cross_tenant_networks.sql` with `networks` and `network_memberships` tables
  - Created `backend/src/services/network.ts` — full CRUD + membership management
  - Created `backend/src/controllers/networkController.ts` — superadmin + tenant endpoints
  - Created `backend/src/routes/superadminNetworkRoutes.ts` — superadmin network routes with auth/role guards
  - Created `backend/src/routes/tenantNetworkRoutes.ts` — tenant network routes
  - Updated `backend/src/middlewares/validate.ts` — added `createNetwork`, `updateNetwork`, `addNetworkMember` Zod schemas
  - Updated `backend/src/app.ts` — registered both network route groups
- **Phase 1.8: API Service Updates (UI) — COMPLETE:**
  - Added to `UI/src/services/api.ts`: `getSuperAdminNetworks`, `getSuperAdminNetworkById`, `createNetwork`, `updateNetwork`, `deactivateNetwork`, `addNetworkMember`, `removeNetworkMember`, `suspendNetworkMember`, `getMyNetworks`, `getMyNetworkDetails`, `leaveNetwork`
- **Phase 1.6: SuperAdmin UI — Networks Tab — COMPLETE:**
  - Added `Networks` tab to `SuperAdminDashboard.tsx` tabs (now: Tenants, Webhooks, Stats, Networks)
  - Networks tab shows table with: name, slug, description, member_count, active status, actions (add member, deactivate)
  - Created "Create Network" modal (name, slug, description fields)
  - Created "Add Member" modal (tenant ID input)
  - Added `loadNetworks`, `handleCreateNetwork`, `handleDeactivateNetwork`, `handleAddMember`, `handleRemoveMember` handlers
  - Added `networkStatusConfig` for pending/active/suspended display
  - Updated `activeTab` type to `'tenants' | 'subscriptions' | 'logs' | 'networks'`
- **Phase 1.7: Tenant UI — My Networks Component — COMPLETE:**
  - Created `UI/src/components/MyNetworks.tsx` — standalone component
  - Shows list of networks tenant belongs to with status badges
  - Detail view: network info, member count, customer count, tenant members list
  - Leave network functionality with confirmation
  - Loading states, empty states, error handling with Arabic labels
- **Phase 1.9: Refactor & Integrate — COMPLETE:**
  - Added "الشبكات" (Networks) nav item to `AdminLayout.tsx` sidebar
  - Integrated `<MyNetworks />` component into `AdminDashboard.tsx` under `networks` tab
  - TypeScript compilation passes (no errors)

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- **Multiple networks per tenant**: Tenants can belong to more than one network
- **Exchange rates negotiated**: Both source and destination tenants set their rates
- **Dual settlement**: Manual bank transfer (SuperAdmin confirms) and subscription deduction
- **Customer linking via mobile + OTP**: Phone number is universal identifier; OTP required
- **Phased implementation**: 5 separate phases, each independently deployable/testable
- `network_points_ledger` separate from `wallet_ledger` — per-tenant accounting clean
- **Route splitting**: `superadminNetworkRoutes.ts` and `tenantNetworkRoutes.ts` (not single file)
- **Migration number**: `007` since 005/006 already exist
- **MyNetworks as separate component**: `UI/src/components/MyNetworks.tsx` rather than inline in AdminDashboard — reusable, cleaner separation
- **SuperAdminDashboard state type**: Extended `activeTab` union type to include `'networks'`
- **Network status display**: Added `pending` and `suspended` to status config alongside existing `active`/`past_due`/`canceled`
- **AdminLayout nav item**: Uses `Network` icon from phosphor-icons for the sidebar nav

## Next Steps
- **Phase 2**: Migration for `point_exchange_rates` (extend with `network_id`), build exchange rate service/controller, add UI for rate management
- **Phase 3**: Migration for `network_points_ledger`, `cross_tenant_redemptions`; build `crossTenantLoyalty.ts` service
- **Phase 4**: Migration for `settlements`, `settlement_items`; build settlement service/controller/dashboard
- **Phase 5**: Migration for `network_customers`, `network_customer_links`; integrate OTP for network verification

## Critical Context
- Current `wallet_ledger` stores points per-tenant with types: earned/redeemed/bonus/refund/expired/adjustment; always positive integers; sign determined by type
- `customers` table has `phone` column unique per-tenant (NOT globally unique) — same phone in two tenants = two separate records
- `branch_users` table links cashier users to tenants (role=cashier only)
- Tenant isolation via `resolveTenant()` middleware via `X-Tenant-Id` header
- `point_exchange_rates` table already exists in schema.sql with `tenant_id` FK — needs `network_id` column added
- SuperAdmin toggle tenant error (`invalid input syntax for type uuid: "t1"`) — SuperAdminDashboard has hardcoded mock IDs
- Existing OTP service (`backend/src/services/otp.ts`) has `generateOtp()`, `sendOtp()`, `verifyOtp()` — will extend for network verification
- App.ts route registration order matters — `/api/superadmin` must come before `/api/superadmin/networks`
- `MyNetworks.tsx` component uses RTL direction (`style={{ direction: 'rtl' }}`) for Arabic layout
- SuperAdminDashboard uses CSS variables for admin theme (`--color-admin-*`): `adminCard`, `adminCardHover`, `adminText`, `adminTextMuted`, `adminBorder`, `adminBg`
- `api.ts` uses `getAdminHeaders()` (with X-Tenant-Id) for tenant endpoints and `getSuperAdminHeaders()` for superadmin endpoints
- `AdminLayout.tsx` sidebar nav uses `navItems` array with `key`, `label`, `icon` — added `{ key: 'networks', label: 'الشبكات', icon: Network }`
- AdminDashboard reads active tab from `location.state.tab` via `useLocation()`

## Relevant Files
- `DB/schema.sql`: Current full database schema
- `DB/migrations/007_cross_tenant_networks.sql`: **CREATED** — networks + network_memberships tables
- `backend/src/services/network.ts`: **CREATED** — Network CRUD + membership management
- `backend/src/controllers/networkController.ts`: **CREATED** — Network API endpoints
- `backend/src/routes/superadminNetworkRoutes.ts`: **CREATED** — Superadmin network routes
- `backend/src/routes/tenantNetworkRoutes.ts`: **CREATED** — Tenant network routes
- `backend/src/middlewares/validate.ts`: **UPDATED** — Added network Zod schemas
- `backend/src/app.ts`: **UPDATED** — Registered network routes
- `backend/src/services/loyalty.ts`: Core earn/redeem/refund logic — extend for cross-tenant
- `backend/src/services/otp.ts`: OTP service — extend for network verification
- `backend/src/controllers/loyaltyController.ts`: Customer-facing loyalty endpoints
- `backend/src/controllers/adminController.ts`: Admin manual points operations
- `backend/src/controllers/superadminController.ts`: Superadmin CRUD for tenants
- `backend/src/middlewares/auth.ts`: JWT verification, role guards
- `backend/src/helpers/resolveTenant.ts`: Tenant resolution middleware
- `backend/src/config/db.ts`: PostgreSQL pool configuration
- `UI/src/pages/SuperAdminDashboard.tsx`: **UPDATED** — Added Networks tab with CRUD, member management, modals
- `UI/src/services/api.ts`: **UPDATED** — Added all network API methods (superadmin + tenant)
- `UI/src/components/MyNetworks.tsx`: **CREATED** — Tenant-facing My Networks component
- `UI/src/pages/AdminDashboard.tsx`: **UPDATED** — Integrated MyNetworks under networks tab
- `UI/src/layouts/AdminLayout.tsx`: **UPDATED** — Added Networks nav item to sidebar
- `UI/src/pages/CustomerDashboard.tsx`: Customer dashboard — add network linking (Phase 5)
- `UI/src/pages/RewardsPage.tsx`: Rewards page — add network rewards filter (Phase 5)

### New Files Created (Phase 1)
- `DB/migrations/007_cross_tenant_networks.sql`
- `backend/src/services/network.ts`
- `backend/src/controllers/networkController.ts`
- `backend/src/routes/superadminNetworkRoutes.ts`
- `backend/src/routes/tenantNetworkRoutes.ts`
- `UI/src/components/MyNetworks.tsx`

### New Files to Create (Future Phases)
- `backend/src/services/exchangeRate.ts`
- `backend/src/services/crossTenantLoyalty.ts`
- `backend/src/services/settlement.ts`
- `backend/src/services/networkCustomer.ts`
- `backend/src/controllers/exchangeRateController.ts`
- `backend/src/controllers/crossTenantController.ts`
- `backend/src/controllers/settlementController.ts`
- `backend/src/controllers/networkCustomerController.ts`

### Full API Endpoints Planned

**Network (superadmin) — Phase 1 ✅:**
- `POST /api/superadmin/networks` — Create network
- `GET /api/superadmin/networks` — List all networks
- `GET /api/superadmin/networks/:id` — Get network details
- `PATCH /api/superadmin/networks/:id` — Update network
- `DELETE /api/superadmin/networks/:id` — Deactivate network
- `POST /api/superadmin/networks/:id/members` — Add tenant
- `DELETE /api/superadmin/networks/:id/members/:tenantId` — Remove tenant
- `PATCH /api/superadmin/networks/:id/members/:tenantId/suspend` — Suspend member
- `GET /api/tenants/me/networks` — Get my networks
- `GET /api/tenants/me/networks/:id` — Get network details (member)
- `DELETE /api/tenants/me/networks/:id/leave` — Leave network

**Exchange Rate:** (Phase 2)
- `PUT /api/tenants/me/networks/:networkId/rate` — Set my rate
- `GET /api/tenants/me/networks/:networkId/rate` — Get my rate
- `GET /api/superadmin/networks/:networkId/rates` — Get all rates

**Cross-Tenant:** (Phase 3)
- `POST /api/loyalty/cross-tenant/redeem` — Redeem across tenants
- `GET /api/loyalty/cross-tenant/balance` — Network-wide balance
- `GET /api/loyalty/cross-tenant/history` — History
- `POST /api/loyalty/cross-tenant/verify-identity` — Verify at destination

**Settlement:** (Phase 4)
- `GET /api/superadmin/networks/:networkId/settlements/pending` — Pending
- `POST /api/superadmin/networks/:networkId/settlements` — Create settlement
- `PATCH /api/superadmin/settlements/:id/confirm` — Confirm bank transfer
- `POST /api/superadmin/settlements/:id/subscribe-deduct` — Settle via subscription
- `GET /api/superadmin/networks/:networkId/settlements` — History
- `GET /api/superadmin/networks/:networkId/settlements/analytics` — Analytics

**Network Customer:** (Phase 5)
- `POST /api/loyalty/network/link` — Link to network via OTP
- `GET /api/loyalty/network/profile` — Get network profile
- `GET /api/superadmin/networks/:networkId/customers` — List network customers
- `DELETE /api/loyalty/network/unlink/:tenantId` — Unlink from tenant
