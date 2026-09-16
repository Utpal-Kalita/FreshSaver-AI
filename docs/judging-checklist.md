# FreshSaver Judging Checklist

## Submission Positioning

One-line pitch:

FreshSaver gives independent grocers an explainable, demand-aware markdown workflow
that connects near-expiry inventory to relevant shoppers and store-scoped orders.

Claims discipline:

- `/demo` uses synthetic products, forecasts, shopper preferences, redemptions, and
  campaign values.
- Campaign sales are simulated attributed value, not incremental sales.
- Expected units and expected waste are model predictions or labeled fallback
  estimates, not outcomes.
- The connected workflow uses XGBoost predictions and grounded Gemini generation;
  the credential-free demo uses the deterministic availability fallback.
- No production accuracy, revenue lift, waste reduction, deliverability, latency,
  accessibility, or security metric has been established.

## Requirements Traceability

| Requirement | Status | Judge evidence |
|---|---|---|
| Credential-free demo | Implemented | Open `/demo`; no account, database, or provider credential is required |
| Synthetic data disclosure | Implemented | Header badge and demo documentation label all demo records and events synthetic |
| Demand-aware recommendations | Implemented | `lib/demand-forecast.ts` and `lib/markdown-recommender.ts` |
| Explainable price alternatives | Implemented | `/demo` candidate bars and `/dashboard/scans/[id]` evidence table |
| Expiry guardrail | Implemented | Recorded expiry at `<= 0` returns `blocked` and marks connected products expired |
| Manual override | Implemented | Manager-set price returns `manual_override` and is not replaced |
| Sparse-data behavior | Implemented | Labeled `category_prior` fallback with fixed tier discount |
| CSV import | Implemented | Store-admin-only 5 MB route, 10,000-row parser, row errors, per-store SKU upsert |
| CSV audit copy | Partial by design | Storage upload is attempted, but failure is non-fatal; upload log still records result |
| Store-scoped products | Implemented | Product queries and imports filter/tag `store_id` |
| Store-scoped manual scans | Implemented | Store assignment is resolved server-side and passed to `runScan` |
| Scheduled scans | Implemented/configurable | Vercel cron calls `/api/scan/cron` every 48 hours with `CRON_SECRET` |
| Recommendation audit | Implemented | Migration 006 fields, scan results, model version, reason JSON, and price history helper |
| Customer category matching | Implemented | Subscribed categories are matched case-insensitively in `lib/email.ts` |
| Email deduplication | Implemented | Unique customer, SKU, and tier log lookup and database constraint |
| Marketplace | Implemented | Public home, deals, stores, store, and product routes |
| Cart and checkout | Implemented as demo commerce | One-store cart, authenticated checkout, and explicit mock payment form |
| Server price validation | Implemented | Order route ignores cart prices and re-reads product state and price |
| Customer orders | Implemented | Order creation and customer account history |
| Merchant order workflow | Implemented | Store ownership check and constrained status transitions |
| Atomic checkout | Not implemented | Order, items, and stock changes are not one transaction; required before production |
| Real payment | Not implemented | Payment UI is intentionally mock and performs no charge |
| Causal impact measurement | Not implemented | Requires controlled pilot; no incremental-sales claim is permitted |

## Demo Acceptance

- [ ] `/demo` loads in a clean browser session without authentication.
- [ ] The `Synthetic data` badge is visible before any KPI is discussed.
- [ ] Organic whole milk displays a markdown recommendation and multiple candidates.
- [ ] Greek yogurt demonstrates a hold-price decision.
- [ ] Approving a markdown reveals a category-derived matched shopper count.
- [ ] Simulating a redemption updates redemptions and campaign sales.
- [ ] Presenter says campaign sales are not claimed as incremental.
- [ ] Presenter calls expected demand and waste estimates, not measured results.
- [ ] Primary demo completes between 4:00 and 4:40.
- [ ] A refresh or network failure can be recovered without connected credentials.

## Product Acceptance

- [ ] Store admin cannot import inventory before authentication and assignment.
- [ ] CSV rejects missing required columns, invalid dates, non-positive prices, MRP
  below price, negative stock, duplicate file SKUs, files over 5 MB, and over 10,000
  rows.
- [ ] The same SKU can exist in two stores but not twice in one store.
- [ ] Manual store scan reads and updates only the assigned store.
- [ ] Scan detail refuses a scan from another store.
- [ ] Expired and inactive products are unavailable to marketplace ordering.
- [ ] Manual price override survives a scan.
- [ ] Product-level evidence records version, mode, explanation, inputs, candidates,
  confidence, and validation MAE when available.
- [ ] Category matching honors subscription state and category preferences.
- [ ] Missing `BREVO_API_KEY` skips email without failing recommendation persistence.
- [ ] Duplicate customer, SKU, and tier email is not sent.
- [ ] Cart cannot mix stores.
- [ ] Checkout requires customer authentication and clearly says mock payment.
- [ ] Order API rejects missing store/items, unavailable products, and insufficient
  stock, and uses database prices.
- [ ] Customer sees only their order history through the customer order endpoint.
- [ ] Store admin changes only an order belonging to their store and only through an
  allowed status transition.

## Model And Evidence Acceptance

- [ ] XGBoost, deterministic constraints, Gemini generation, and the labeled
  availability fallback are distinguished in spoken and written materials.
- [ ] Sparse mode is not described as learned category performance; its current
  velocity fallback is stock-derived.
- [ ] Confidence is not described as a calibrated probability.
- [ ] Validation MAE is not described as recommender accuracy or business lift.
- [ ] Fixed elasticity values are labeled assumptions.
- [ ] No metric from a PRD is presented as achieved without a measurement artifact.
- [ ] Real-data pilot plan includes time-based validation and simple baselines.
- [ ] Causal business claims require a valid control group.

## Security Acceptance

- [ ] No `.env`, provider token, password, service-role key, or real customer record
  appears in slides, terminal history shown on screen, repository changes, or logs.
- [ ] Any secret exposed during development or presentation has been revoked and
  rotated before deployment.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `BREVO_API_KEY`, and
  `GEMINI_API_KEY` exist only in server-side environment configuration.
- [ ] Public Supabase URL and anon key are protected by least-privilege RLS, not by
  secrecy assumptions.
- [ ] Cron returns 503 when unconfigured and 401 for an incorrect bearer secret.
- [ ] Service-role routes authenticate and authorize before every tenant query.
- [ ] Scan log listing is store-filtered before production; the current generic
  `GET /api/scan` route needs this remediation.
- [ ] Customer administration endpoints are role-restricted before production; the
  current `/api/customers` handlers require authentication but not an admin role.
- [ ] Quantity validation, atomic order creation/reservation, idempotency, and
  concurrency tests are complete before accepting real payment.
- [ ] Dynamic values inserted into email HTML are escaped or rendered by a safe
  template system before production use.
- [ ] Upload retention, access, tenant naming, and deletion policy are configured.
- [ ] Consent, unsubscribe, suppression, and email frequency policies are tested.

## Technical Verification

Checked on 2026-09-14:

- [x] `npm test` passes: 7 files, 20 tests.
- [x] `npm run typecheck` passes.
- [x] Forecast unit tests cover history and sparse fallback modes.
- [x] Recommender unit tests cover expiry, hold, candidate selection, sparse
  fallback, and manager override.
- [x] CSV unit tests cover valid import and invalid row behavior.
- [x] Date tests cover expiry boundary behavior.

Run again against the final deployment candidate:

- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Apply migrations 001 through 008 in order to a clean staging project.
- [ ] Complete a two-store isolation test with separate store-admin accounts.
- [ ] Complete customer, store-admin, super-admin, and unauthenticated route tests.
- [ ] Complete mobile and desktop smoke tests for marketplace, demo, and dashboard.
- [ ] Complete failure tests for Supabase, Storage, Brevo, and cron authentication.

## Final Acceptance List

- [ ] Presentation contains exactly 10 slides and fits the event time limit.
- [ ] Demo script has been rehearsed twice between 4:00 and 4:40.
- [ ] `/demo` is the opening tab and requires no credentials.
- [ ] All synthetic data is labeled verbally and visually.
- [ ] No one claims campaign sales are incremental.
- [ ] Model limitations and current evaluation gaps are stated plainly.
- [ ] Connected demo account contains no real customer or payment data.
- [ ] Backup plan works with network access disabled.
- [ ] Final deployment uses rotated secrets and a non-production Supabase project.
- [ ] Migrations 006-008 are applied and AI provenance plus pending recommendations appear in a new scan.
- [ ] Store isolation, order authorization, and cron authentication have been checked.
- [ ] Mock payment is never represented as a real transaction.
- [ ] Repository status contains only intended submission files.
- [ ] No commit or push is performed unless explicitly requested.
