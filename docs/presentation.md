# FreshSaver Hackathon Presentation

## Slide 1: Fresh Today. Expired Tomorrow. Wasted Forever.

Open with a public-domain photograph of supermarket food that has already lost its
opportunity to be sold. FreshSaver gives the owner one more chance to act before
inventory reaches that outcome.

- Detect near-expiry inventory.
- Recommend a price with an explanation.
- Match opted-in shoppers by category.
- Carry the deal through checkout and merchant fulfillment.

Speaker note: Make the global issue visual and human. The goal is not the deepest
discount; it is a reviewable decision made while food still has value. Attribute
the image to KVDP via Wikimedia Commons; it is public domain.

## Slide 2: The Waste Is Global. The Decision Is Local.

- UNEP reports 1.05 billion tonnes of food waste in 2022 across households, food
  service and retail, including inedible parts.
- Retail represented 12% of the total.
- Food loss and waste impose an estimated global economic toll of roughly US$1
  trillion and generate 8–10% of annual global GHG emissions.
- A separate European Commission study estimates that up to 10% of annual EU food
  waste is linked to date marking.

For an independent grocer, the global problem becomes one recurring shelf decision:
hold, markdown, or lose the stock. FreshSaver combines stock, expiry urgency,
recent demand, unit economics, customer activation, and orders in one loop.

Speaker note: Keep scopes precise. Do not claim that 1.05 billion tonnes are caused
by expiry dates. Cite UNEP Food Waste Index Report 2024 and the European Commission
2018 date-marking study. Full links are in `docs/evidence/problem-sources.md`.

## Slide 3: One Loop For Merchant And Shopper

1. Merchant imports store inventory from CSV.
2. Manual or scheduled scan builds a per-product demand estimate.
3. XGBoost predicts sell-through for every eligible markdown candidate.
4. The constrained optimizer proposes a price and Gemini generates a grounded explanation and campaign.
5. The merchant approves or rejects the pending recommendation.
6. Approved products match store-specific opted-in customer categories for email.
7. Customers browse deals, use mock checkout, and create store-scoped orders.
8. Merchant accepts, completes, or cancels valid order transitions.

Speaker note: CSVs and scans are tagged with the merchant's store. Customer prices
are re-read from the database when an order is created.

## Slide 4: Credential-Free Judge Demo

Route: `/demo`

- Uses the real `freshsaver-demand-v1` recommender.
- Uses only synthetic products, demand inputs, shopper preferences, and events.
- Runs without Supabase, Brevo, or login credentials.
- Shows candidate prices, an explanation, forecast evidence, approval, matching,
  and simulated redemption.

Important: Campaign sales on this page are attributed synthetic demo value. They
are not claimed as incremental sales or measured business impact.

Speaker note: Approve Organic whole milk, show the matched count, then simulate two
redemptions. Keep the `Synthetic data` badge visible.

## Slide 5: Two AIs. Two Jobs. One Controlled Decision.

### AI 1: XGBoost — Prediction

- What: predicts low, expected, and high sell-through for every candidate price.
- Why: stock, price, expiry, category and sales velocity form a nonlinear tabular
  prediction problem, which is where gradient-boosted trees are strong.

### Deterministic Optimizer — Not AI

- What: selects the strongest eligible contribution score.
- Why: price floors, expiry blocks, manual overrides and discount bounds must be
  deterministic and testable.

### AI 2: Gemini — Language

- What: translates fixed model evidence into a manager explanation, campaign copy,
  and a product-specific recipe idea.
- Why: explanation and communication are language tasks. Gemini never calculates or
  changes the selected price.

### Store Owner — Human Authority

- What: approves or rejects the pending recommendation.
- Why: pricing accountability remains with the merchant.

Speaker note: Say the role split explicitly: XGBoost predicts, policy constrains,
Gemini communicates, and the owner decides. XGBoost is live; Gemini is optional and
uses a safe template fallback when unavailable. Synthetic model results demonstrate
behavior, not real-world lift.

## Slide 6: Every Recommendation Leaves Evidence

Migration `006_demand_aware_markdowns.sql` adds:

- Recommended price and discount.
- Reason JSON, reason codes, confidence, version, and timestamp.
- Product-level scan evidence and store-scoped audit fields.
- Append-only price history helper.
- Stock decrement helper restricted to the service role.

Operational guardrails:

- Passed expiry blocks automated sale.
- Manager price override wins.
- Healthy forecast demand can hold price.
- Sparse data is labeled instead of disguised as learned history.
- Markdown recommendations require owner approval before publication or email.
- Every audit record identifies XGBoost versus fallback and Gemini versus template.

Speaker note: Show a scan detail page if the connected environment is available.

## Slide 7: Activation Meets The Marketplace

- Public customer pages expose active, non-expired products and stores.
- Opted-in shoppers are matched against product categories.
- Brevo sends product and store context when configured.
- Email logs deduplicate by customer, SKU, and tier.
- Cart and checkout lead to customer order history.
- Store admins see and manage orders for their assigned store.

Speaker note: Checkout is explicitly a mock payment experience. No card processor
or real charge is part of the MVP.

## Slide 8: Built As A Store-Scoped Web System

- Next.js 16 App Router and React 19.
- Supabase Auth, PostgreSQL, RLS, and CSV object storage.
- Service-role access confined to server modules and route handlers.
- Vercel cron calls a secret-protected endpoint every 48 hours.
- Store-admin authorization scopes import, scan execution, scan detail, products,
  and order management.
- `/demo` is an isolated client-side synthetic path.

Speaker note: The browser is untrusted. Public Supabase values can be visible, but
the service role, cron secret, and email key must remain server-only.

## Slide 9: What Is Proven And What Is Not

Proven in the current codebase:

- Unit tests cover forecast fallback/history behavior, XGBoost candidate integration,
  Gemini structured output/fallback, markdown guardrails, CSV validation, and dates.
- `npm test` passes 20 tests across seven files as checked on 2026-09-16.
- `npm run typecheck` passes as checked on 2026-09-15.
- The demo labels synthetic data and non-incremental campaign sales.

Not yet proven:

- Forecast quality on representative real-store data.
- Calibration of confidence or category elasticity.
- Incremental sales, margin lift, or waste reduction.
- Production load, deliverability, accessibility, or security targets.
- Atomic order creation and inventory reservation under concurrency.

Speaker note: This is an honest MVP boundary, not a weakness hidden behind metrics.

## Slide 10: Pilot, Measure, Then Scale

Pilot plan:

1. Shadow recommendations without changing prices.
2. Compare forecasts with realized accepted and completed orders.
3. Require manager approval and capture overrides with reasons.
4. Randomize eligible products or stores where operationally safe.
5. Measure waste units, gross margin, sell-through, opt-outs, and complaints.
6. Add transactional order and stock reservation before real payment processing.

Close: FreshSaver already connects an explainable markdown decision to the people
and workflow that can act on it. The next claim will come from a controlled pilot,
not from synthetic campaign totals.
