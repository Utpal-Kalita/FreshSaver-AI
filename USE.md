# FreshSaver Usage Guide

## Fastest Demo

The judge demo needs no database or API credentials:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/demo`.

The route uses synthetic products and demand evidence with the production
`freshsaver-demand-v1` recommender. Select inventory, inspect tested prices,
approve an offer, view preference-based shopper matching, and simulate a
redemption.

## Full Application Setup

1. Create a Supabase project.
2. Apply every SQL file in `supabase/migrations/` in numeric order, including
   `006_demand_aware_markdowns.sql`.
3. Copy `.env.example` to `.env.local` and provide Supabase credentials.
4. Add Brevo credentials only if real email delivery is required.
5. Run `npm run dev`.

Never commit `.env.local` or a service-role key. If this repository previously
contained a service-role key, revoke and replace it in Supabase before use.

## Main Routes

| Route | Purpose |
|---|---|
| `/demo` | Public credential-free hackathon demo |
| `/` | Customer marketplace when Supabase is configured |
| `/deals` | Active near-expiry offers |
| `/stores` | Store discovery and map |
| `/cart` | Single-store shopping cart |
| `/checkout` | Mock payment and server-validated order creation |
| `/dashboard` | Store performance and scan trigger |
| `/dashboard/products` | Inventory and recommendation explanations |
| `/dashboard/products/upload` | Validated CSV import |
| `/dashboard/scans` | Store-scoped scan history |
| `/dashboard/scans/[id]` | Candidate prices and model evidence |
| `/dashboard/orders` | Merchant order management |
| `/admin/dashboard` | Super-admin platform operations |

## CSV Upload

Use `sample_inventory.csv` or `public/sample-products.csv`.

```csv
product_name,sku,price,mrp,expiry_date,category,image_url,stock_quantity
Organic Whole Milk,DAIR-104,84,95,2026-09-18,Dairy,,18
```

FreshSaver rejects missing columns, invalid calendar dates, duplicate SKUs,
negative stock, non-positive prices, oversized files, and files over 10,000 rows.
SKU uniqueness is scoped to a store.

## How A Scan Works

1. Fetch active, non-excluded inventory for the current store.
2. Fetch 30 days of accepted and completed order history.
3. Build a per-product velocity, weekday factor, sample count, and validation MAE.
4. Use a clearly labeled fallback when history is sparse.
5. Block expired products and preserve manager overrides.
6. Evaluate bounded candidate markdowns using expected revenue and waste risk.
7. Save the price, explanation, confidence, alternatives, inputs, and model version.
8. Notify subscribed customers whose category preferences match newly tiered items.
9. Preserve scan, email, price, and order records for audit.

Pricing does not depend on a Gemini or OpenRouter API key.

## Scheduled Scans

Vercel calls `/api/scan/cron` every two days according to `vercel.json`.
Requests require:

```text
Authorization: Bearer <CRON_SECRET>
```

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

See `README.md` for the product narrative and `docs/` for the demo script,
presentation, architecture, model card, judging checklist, and security notes.
