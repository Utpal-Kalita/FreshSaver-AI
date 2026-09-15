# FreshSaver Demo Script

Target runtime: 4:30 (acceptable range: 4:00-4:40)

Primary route: `/demo`

The primary demo is credential-free and does not require Supabase, Brevo, or any
other external service. All products, shoppers, forecasts, redemptions, and
campaign values shown on `/demo` are synthetic demo data. The page runs the real
`freshsaver-demand-v1` recommendation code in the browser.

## Before Going On Stage

- Open `/demo` in a desktop browser and confirm the `Synthetic data` badge is visible.
- Reset the page so Organic whole milk is selected and no offer is launched.
- Set browser zoom so the priority queue, decision panel, and KPI cards fit together.
- Keep `/deals`, `/dashboard`, and a scan detail page in background tabs only if the
  connected environment and test accounts were verified before the presentation.
- Do not enter real card data. Checkout uses a mock payment form, but the primary
  judge path does not require checkout or credentials.
- If the connected environment is unavailable, stay on `/demo`; the complete core
  decision and activation story still works without network credentials.

## Timed Run Of Show

### 00:00-00:25 - State The Problem

Show: The `/demo` header and four KPI cards.

Say:

"UNEP reports 1.05 billion tonnes of food waste in 2022 across households, food
service and retail. The economic toll of food loss and waste is roughly one trillion
US dollars a year. But for a neighborhood grocer, that global problem appears as a
local question: what should I discount, by how much, and when? FreshSaver recommends
a price per product, explains the decision, and connects the approved offer to
shoppers who asked for that category."

Point to the `Synthetic data` badge.

"Everything on this judge page is clearly labeled synthetic. It is designed to
demonstrate product behavior, not claim measured store outcomes."

### 00:25-01:10 - Show The Decision Queue

Show: The inventory decisions list. Keep Organic whole milk selected.

Say:

"The queue combines stock, days to expiry, and a demand forecast. For this milk,
the system estimates how many units sell at the current pace, tests the eligible
markdowns, and selects the strongest revenue-and-waste score."

Point to:

- Recommended price and discount.
- Current pace versus with-offer estimate.
- The plain-language explanation.

Say:

"These are model estimates, not observed sales. A manager still approves the
offer."

### 01:10-01:55 - Make The Model Inspectable

Show: Confidence, 30-day store history, backtest MAE, and the price candidate bars.

Say:

"The connected agent uses XGBoost to predict sell-through for every eligible price
and exposes the prediction range and top contributing features. A deterministic
policy then enforces expiry, price floors, and manager controls. Gemini receives
only that fixed evidence to explain the decision and write the campaign; it cannot
change the price. This offline page uses the labeled fallback so it remains reliable
without external credentials."

Click: Select Greek yogurt.

Say:

"When forecast demand can clear stock, FreshSaver holds price instead of giving
away margin. It also blocks expired products and respects manager overrides in the
connected merchant workflow."

Click: Return to Organic whole milk.

### 01:55-02:35 - Approve And Match Shoppers

Click: `Approve and match shoppers`.

Show: The customer activation panel and matched shopper count.

Say:

"Approval activates category matching. This count comes from synthetic shopper
preference records on the page, not from a hard-coded count per product. In the
connected application, opted-in customers are matched case-insensitively by
category, Brevo sends the email, and an email log prevents repeat sends for the
same customer, SKU, and tier."

### 02:35-03:05 - Show Attribution Without Overclaiming

Click: `Simulate redemption` twice.

Show: Offer redemptions and Campaign sales changing.

Say:

"The demo records attributed redemption events and multiplies redeemed units by
the recommended price. Campaign sales are attributed demo value only. We do not
claim they are incremental sales, because this prototype has no control group or
causal experiment."

### 03:05-03:45 - Connect The End-To-End Product

Show: Stay on `/demo`, or briefly show pre-verified connected tabs.

Say:

"Around this decision loop is a Next.js and Supabase marketplace. A store admin
imports a validated CSV, inventory is scoped to that store, and a manual or
48-hour cron scan writes XGBoost and Gemini provenance through migrations 006-008.
The recommendation stays pending until the owner approves it, which publishes the
price and sends the generated campaign to that store's opted-in shoppers."

If connected tabs are safe, show in this order without pausing:

1. `/dashboard/products/upload` for CSV ingestion.
2. `/dashboard/pricing` for AI evidence and owner approval.
3. `/deals` for the customer marketplace.
4. `/dashboard/orders` for merchant fulfillment.

### 03:45-04:15 - Explain Safety And Auditability

Show: The explanation and model version on `/demo`.

Say:

"Every decision records its version, mode, inputs, candidate prices, confidence,
and explanation. Expired goods are blocked, sparse history falls back to a labeled
prior, and manager-set prices are never overwritten. Server routes re-read prices
and availability at order creation instead of trusting the cart."

### 04:15-04:30 - Close

Say:

"FreshSaver turns expiry from a periodic spreadsheet check into an explainable,
store-scoped workflow: detect risk, protect margin, reach relevant shoppers, and
capture the order before food becomes waste. The next milestone is a controlled
store pilot that measures forecast quality, waste, margin, and true incremental
sell-through."

## Recovery Lines

- If `/demo` is refreshed: "The page resets intentionally because its synthetic
  state is local and credential-free."
- If email is unavailable: "Brevo is optional for the local demo; failed or skipped
  sends do not prevent scan evidence from being saved."
- If the database is unavailable: "The core judge flow uses the same recommender
  with synthetic inputs and does not depend on Supabase."
- If asked for ROI: "No causal ROI claim has been established. Campaign sales in
  the demo are attributed simulated value, not incremental revenue."
