# MO2 Loyalty — Frontend UI

React 19 PWA and multi-surface dashboard interface for the **MO2 Loyalty** platform, built with Vite 6, TypeScript, Tailwind CSS v4, Motion (`motion/react`), Recharts, Phosphor Icons, and `vite-plugin-pwa`.

## Surfaces & Routes

- **`/*` — Customer PWA:** Mobile-first RTL/LTR Arabic & English loyalty wallet, 3D membership pass, product menu, rewards catalog, redemption vouchers, itemized transaction history, profile settings, and OTP sign-in.
- **`/admin` — Merchant Dashboard:** Tenant administration (`owner` / `manager`) for customers, points adjustments, rewards, branches, printable table/branch QR codes, retention charts, and branding.
- **`/cashier` — Cashier POS View:** Redemption voucher verification and manual points award fallback for non-POS branches.
- **`/superadmin` — Super Admin Console:** Platform tenant management, billing plans, cross-tenant networks, and webhook inspection.
- **`/pitch` — Interactive Sales Showcase:** Three switchable animated presentation themes, customizable café branding, interactive mobile/cashier previews, and ROI calculator.

## Environment Setup

```bash
cp .env.example .env
```

Set `VITE_API_URL` in `.env` (defaults to `http://localhost:4000/api` in development, and `/api` when built behind Nginx):

```env
VITE_API_URL=http://localhost:4000/api
```

## Available Scripts

```bash
npm install
npm run dev      # Start Vite dev server on http://localhost:3000
npm run lint     # Run TypeScript type check (tsc --noEmit)
npm run build    # Build production bundle + PWA service worker into dist/
npm run preview  # Preview the production dist/ build locally
```
