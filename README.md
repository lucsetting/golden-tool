# Golden Tool

Monthly spending control web app. Sold on Digistore24 as the front-end product; **Golden Tool Pro** is the upsell, unlocked inside the app with an activation code.

Stack: Vite, React, TypeScript, Tailwind v4, zustand (persisted to the browser), Recharts, lucide-react. No backend. Data lives in the buyer's browser; they can export/import a JSON backup from Settings. Installable as a PWA.

## Live app and deploy

**URL:** https://app.thegoldentool.us/ (custom domain; GitHub Pages origin lucsetting.github.io/golden-tool) (GitHub Pages, repo `lucsetting/golden-tool`, public).

Deploy is automatic: every push to `main` runs `.github/workflows/pages.yml`, which builds with
`VITE_BASE=/golden-tool/`, the Supabase URL and publishable key, and `VITE_LICENSE_SECRET` from the repo secret
`LICENSE_SECRET`, then publishes `dist/`. To generate activation codes that match the live build run
`LICENSE_SECRET=<same value> node scripts/gen-keys.mjs <kind> <count>`. Moving to a custom domain later means
setting `VITE_BASE=/` (or just dropping it) in the workflow and pointing the domain at Pages.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
npx tsx scripts/check.ts   # self-check for money math and license codes
```

## Deploy

`dist/` is a static site. Drop it on Vercel, Netlify or Cloudflare Pages (build command `npm run build`, output `dist`). Put the live URL on the Digistore24 thank-you page of the front-end product. That URL is the deliverable.

## Offer structure and activation codes

| Offer | Code prefix | What it does in the app |
|---|---|---|
| Front-end: Golden Tool | none | Full tracking. Included access: 365 days from first use, then read-only (view + export only). |
| Upsell 1: Golden Freedom | `DEBT` | Unlocks the Debts section (planner + schedule). |
| Upsell 2: Golden Goals | `GOAL` | Unlocks the Goals section (goals + emergency fund). |
| Upsell 3: Golden Vision | `RPRT` | Unlocks the Reports section (budgets + yearly + export). |
| Bundle / downsell | `GOLD` | Unlocks all three add-ons. |

Each Digistore24 product's thank-you page shows one code of its prefix. The buyer pastes it in the add-on's locked page, in Settings → Add-ons, or in the "More" page on mobile. Codes are validated offline with a checksum and kept in the backup file.

Locked add-ons are visible in the left rail with a gold dot. Their pages are teasers that use the buyer's own numbers (debt-free date with their leftover budget, emergency fund from their real essentials, the category they overspend on), with the full plan blurred. The Home page adds a calm "For you" card and the sidebar footer rotates a promo. Once the included access ends, adding an expense opens the Lifetime dialog instead; everything stays visible and exportable.

Generate codes:

```bash
node scripts/gen-keys.mjs debts 100     # all | debts | goals | reports
```

Before launch: change `SECRET` in **both** `src/lib/license.ts` and `scripts/gen-keys.mjs` to the same new value, rebuild, and replace the placeholder checkout links in `src/lib/modules.ts`.

Known ceiling: the check is client-side, so a determined person can bypass it. Acceptable for this price point; move to a server check if piracy ever matters.

## Accounts and sync (Supabase)

Webhook go-live checklist and test plan: `PENDING-DIGISTORE.md` (waiting for the Digistore24 products to be approved).

**Live project (2026-11-09):** `golden-tool` in the Main org, ref `rlnfpgbtlrnitbulvwkh`, region Americas, Micro compute. The `tiktok-members-app` project was tried first and timed out on every query (NANO instance with its disk IO budget exhausted), so Golden Tool got its own project; this also keeps its users apart from the TikTok members. Schema from `supabase/schema.sql` is applied. The "Magic link or OTP" and "Confirm sign up" email templates send `{{ .Token }}`; this project issues **8-digit** codes. Sign-in: email + password, with a one-time code for the first visit or a forgotten password; the app asks for a password right after the first code sign-in (`user_metadata.has_password`).

### Setup from scratch

Optional. Without it the app is local-only. With it, buyers sign in by email, state syncs across devices, and purchases unlock add-ons automatically.

1. Create a Supabase project.
2. SQL editor: run `supabase/schema.sql` once.
3. Authentication -> Providers -> Email: enabled. Authentication -> Email Templates (Confirm signup and Magic Link): include `{{ .Token }}` so the email carries the 6-digit code. The app verifies codes, not links.
4. Copy Project URL and anon key (Project Settings -> API) into `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then rebuild.
5. Deploy the IPN function and set its secrets: see `supabase/functions/digistore-ipn/README.md`.

How purchases flow: buyer pays on Digistore24 -> IPN hits the function -> `entitlements` row keyed by the buyer's email -> buyer signs in with the same email -> the add-on unlocks on sign-in. Activation codes keep working as a fallback. Refunds, chargebacks and missed payments flip the row to `refunded` and the add-on locks again.

Owner checklist before launch:
- Real Digistore24 product IDs in `DIGISTORE_PRODUCT_MAP` (one per offer).
- IPN passphrase chosen, set in Digistore24 and as the function secret; `ALLOW_UNSIGNED_IPN` unset.
- Real checkout links replacing the placeholders in `src/lib/modules.ts`.
- Send one signed test IPN (`sign-test.mjs`) and one real low-price test order.

## Design

Logo: option 4 of the fal.ai batch of 2026-11-09 (nano-banana-2, background removed with birefnet). Master at `logo-mark-1024.png`; sized copies in `public/` (favicon 32/96, PWA 192/512, maskable 512, apple-touch-icon 180). Component: `GoldMark` in `src/components/Layout.tsx` and `src/pages/Onboarding.tsx`.


The UI follows Mochi (use.themochi.app) as measured in the owner's reverse engineering: neutral surfaces, hairline borders, Inter at weight 450, text line-height equal to size, 36px buttons with a hairline ring, 44px card headers, metric trays, icon rail + section bar + content panel. Gold replaces Mochi's purple and neutral primary. Tokens live in `src/index.css`, primitives in `src/components/ui.tsx`.

## What's inside

- Home: remaining vs limit ring, safe-to-spend today, pace line, category donut, spending curve vs ideal pace, recent transactions.
- Activity: month navigation, search, category chips, day-grouped list, sort, recurring expenses manager.
- Insights: 6-month bars vs limit, category deltas vs last month, top merchants, weekday pattern, money facts.
- Debts (add-on): snowball/avalanche planner, debt-free date, interest saved, month-by-month schedule.
- Goals (add-on): goals with monthly need, safe-to-save, emergency fund target from real essentials.
- Reports (add-on): category budgets with alerts, yearly report, CSV export, plain-English monthly summary.
- Settings: limit, currency, theme, categories (icon/color), recurring, backup export/import, install app, erase.

## Compliance note

Educational budgeting tool. No income claims, no investment advice anywhere in the UI. Keep the sales page the same way.
