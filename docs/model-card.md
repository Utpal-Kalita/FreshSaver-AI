# Model Card: FreshSaver Hybrid Demand And Merchandising System

## Summary

FreshSaver uses three deliberately separated layers:

1. A trained XGBoost regression model served by `ml-service/` predicts units sold
   before expiry for every eligible candidate price and returns prediction ranges,
   clearance probability, and feature contributions.
2. `lib/markdown-recommender.ts` applies deterministic safety and price constraints
   and selects the candidate with the strongest expected contribution. When the ML
   service is unavailable, it records and uses `freshsaver-demand-v1` as a labeled
   fallback.
3. Gemini consumes only the stored numerical evidence to generate a concise manager
   rationale and campaign copy. Gemini cannot alter the candidate prices, selected
   discount, expiry date, or safety controls.

The system creates a pending recommendation with complete provenance. A store owner
must approve it before FreshSaver publishes the price or emails opted-in shoppers.
It is not intended to make autonomous food-safety decisions.

## Intended Use

- Rank and review possible markdowns for active store inventory.
- Hold price when estimated demand is sufficient to clear available stock.
- Suggest a bounded markdown when stock is likely to remain before expiry.
- Block automated sale after the recorded expiry date.
- Preserve a manager-set price instead of applying an automated recommendation.
- Record the inputs, alternatives, and rationale used in each scan.
- Generate grounded manager explanations and campaign copy from fixed evidence.

## Out Of Scope

- Determining whether a product is safe to consume.
- Replacing legal, recall, cold-chain, or store disposal controls.
- Predicting individual customer behavior.
- Personalized prices or prices based on protected characteristics.
- Claiming causal sales lift, margin lift, or waste reduction.
- Real-time inventory reservation or payment authorization.

## Inputs

The scan engine supplies:

| Input | Source | Current treatment |
|---|---|---|
| Product ID and name | Supabase product row | Identification and explanation context |
| Category | Supabase product row | Selects a fixed elasticity assumption |
| Original price | Supabase product row | Price floor basis and candidate revenue |
| Stock quantity | Supabase product row | Clamped to a non-negative integer |
| Days until expiry | Recorded expiry date and current date | Maps to urgency tier |
| Manual override price | Supabase product row | Takes precedence when present |
| Sales observations | Accepted/completed order items | Aggregated over a 30-day query window |
| Candidate discount | Bounded policy list | Input to the demand model for counterfactual prediction |
| Unit cost and price floor | Merchant inventory data | Margin objective and hard pricing constraint |
| Disposal cost | Merchant inventory data | Cost assigned to expected leftover inventory |

The recommender does not use customer identity, email address, subscribed category,
or other customer-level attributes. Category matching happens after a product newly
enters a markdown tier and is separate from the pricing recommendation.

## Demand Forecast

Implementation: `lib/demand-forecast.ts`

For store-history mode:

1. Observations are aggregated into a 30-day UTC daily series; days without an
   observation are represented as zero.
2. At least three positive observations are required to enter `store_history` mode.
3. Daily velocity is `0.70 * mean(last 7 days) + 0.30 * mean(previous 23 days)`.
4. A factor for the current UTC weekday compares that weekday's 30-day average with
   the overall average and is clamped to `[0.70, 1.35]`.
5. A simple validation MAE predicts each of the final seven days with the mean of
   the final seven days in the preceding 23-day segment.

For sparse-history mode:

- Fewer than three positive observations produces mode `category_prior`.
- In the current scan engine, the fallback daily velocity is derived from stock:
  `max(0.25, min(stock, stock / 30))`.
- The mode name should not be interpreted as an empirically learned category
  baseline. No external category sales dataset is currently loaded.
- The weekday factor is 1 and validation MAE is null.

## Recommendation Logic

Expiry tiers:

| Recorded days until expiry | Tier |
|---|---|
| `<= 0` | `expired` |
| `1-15` | `tier_2` |
| `16-30` | `tier_1` |
| `> 30` | `none` |

Candidate discounts:

| Tier | Candidate percentages |
|---|---|
| `tier_1` | 0, 10, 15, 20, 25 |
| `tier_2` | 0, 15, 20, 25, 30, 35, 40 |
| Other | 0 |

When `DEMAND_MODEL_URL` is configured, each candidate receives an XGBoost prediction
with low, expected, and high units, clearance probability, and feature
contributions. The training pipeline uses a time-ordered validation split. When the
model service is unavailable, baseline expected units come from the local forecast
and a fixed category-elasticity fallback.

The selected candidate maximizes:

```text
expected revenue - cost of goods sold - expected disposal cost
```

When unit cost is missing, the fallback score remains expected revenue minus an
urgency-weighted leftover-stock penalty. Fixed elasticity assumptions from 2.4 to
3.8 are used only when XGBoost predictions are unavailable. They remain engineering
assumptions rather than learned coefficients.

Special cases override candidate scoring:

- Expired: action `blocked`; expected sale is zero; automated sale is blocked.
- Manual price present: action `manual_override`; manager price is retained.
- Zero stock or baseline demand at least 90% of stock: hold the current price.
- Sparse history without an ML prediction: use the established 15% or 25% fallback.
- A merchant minimum price removes lower candidates from consideration.
- Markdown recommendations remain pending until an owner approves them.

## Outputs And Interpretation

| Output | Interpretation | Do not interpret as |
|---|---|---|
| Recommended price | Highest-scoring eligible candidate or override | Guaranteed optimal price |
| Expected units sold | ML prediction or labeled fallback estimate | Observed or incremental units |
| Low/high units | Residual-based predictive range | Guaranteed bounds |
| Clearance probability | Model estimate from residual dispersion | Guaranteed sale probability |
| Feature impacts | XGBoost prediction contributions | Causal effects |
| Expected waste | Stock minus scenario units | Measured disposed inventory |
| Confidence | Rule-based signal from sample count and relative MAE | Calibrated probability |
| Validation MAE | Naive demand holdout error in units/day | Pricing-policy lift or generalization guarantee |
| Gemini explanation | Generated summary constrained to stored evidence | Independent verification or model reasoning |

`recommendation_reason`, reason codes, candidate records, mode, metrics, confidence,
and version are persisted by the scan engine. Migration
`006_demand_aware_markdowns.sql` adds product and scan-result evidence fields.
`008_ai_recommendation_workflow.sql` adds economics, pending recommendations,
approval provenance, generated campaign copy, and outcome events.

## Data

Connected application data:

- Product catalog and stock come from store-admin CSV imports and product records.
- Forecast observations come only from order items whose orders are currently
  `accepted` or `completed` and fall inside the scan engine's 30-day query window.
- `ml-service/data/demo_training.csv` is explicitly synthetic and exists to make the
  training and serving path reproducible. It is not evidence of production quality.
- Customer identity and subscription data never enter the demand model or Gemini
  prompt.

Demo data:

- Every product, forecast input, shopper preference, redemption, and campaign value
  on `/demo` is synthetic and embedded in `app/demo/page.tsx`.
- Demo MAE and sample counts are scenario inputs, not measurements from a store.
- Demo campaign sales are simulated attributed value and are not incremental sales.

Data quality dependencies:

- Incorrect expiry, stock, price, category, order status, or order quantity can
  change a recommendation.
- Returns, cancellations after completion, stock adjustments, promotions, holidays,
  weather, local events, and lost sales are not modeled.
- Zero-observation days can mean zero demand or missing order capture; the model
  cannot distinguish them.

## Current Evaluation

As checked on 2026-09-15:

- `lib/demand-forecast.test.ts` contains two passing unit tests for labeled fallback
  and store-history behavior.
- `lib/markdown-recommender.test.ts` covers expiry blocking, price holding,
  deterministic fallback, manager override, and XGBoost candidate integration.
- `lib/gemini-merchandising.test.ts` covers labeled fallback and structured Gemini output.
- The complete Vitest suite passes 18 tests across six files.
- TypeScript checking passes with `npm run typecheck`.

The repository includes a reproducible generator and time-ordered training and
evaluation pipeline. Until it is run on representative merchant data, any report
from the bundled synthetic dataset demonstrates system behavior only. No production
accuracy, revenue lift, waste reduction, or incremental-sales claim is supported.

## Safety And Fairness

Implemented guardrails:

- Recorded expiry at or before the current date blocks automated sale.
- Manual overrides are preserved.
- Candidate discounts are bounded by urgency tier.
- Sparse history is labeled and uses a fixed fallback.
- Recommendations include inspectable alternatives and reason codes.
- Pricing does not consume customer-level or protected-characteristic data.

Residual risks:

- A recorded expiry date is not a food-safety assessment. Stores must enforce
  recalls, storage requirements, use-by rules, and local law independently.
- The heuristic can recommend poorly when order capture is sparse or biased.
- Fixed elasticity can behave differently across stores, products, package sizes,
  seasons, and customer groups.
- A category fallback may systematically over-discount or under-discount categories
  without enough history.
- Confidence can appear more authoritative than warranted because it is not
  calibrated.
- Optimizing revenue and modeled waste does not explicitly constrain gross margin,
  supplier agreements, minimum advertised price, or customer affordability.
- Category email matching can over-contact shoppers whose preferences are broad;
  consent, unsubscribe, frequency caps, and deliverability require monitoring.

## Human Oversight

- Treat recommendations as decision support and retain manager approval for pilots.
- Review expired, recalled, damaged, temperature-abused, or disputed inventory
  outside the recommender.
- Investigate low-history mode, high MAE, unusual stock, and large discount changes.
- Record why managers accept or override recommendations in a production pilot.
- Stop automated application if data feeds, expiry semantics, or order capture are
  unreliable.

## Evaluation Plan

Before production automation:

1. Validate time splits on representative per-store, per-product data.
2. Report MAE and bias by store, category, shelf life, history density, and weekday.
3. Compare against simple baselines such as no markdown and fixed urgency tiers.
4. Backtest stockouts, waste estimates, revenue, and gross margin with uncertainty.
5. Calibrate confidence or rename it to a non-probabilistic evidence score.
6. Run a controlled pilot and measure incremental outcomes against a valid control.
7. Monitor override rate, opt-out rate, complaints, and safety incidents.

## Ownership And Change Control

- Version constant: `RECOMMENDER_VERSION` in `lib/markdown-recommender.ts`.
- A behavior or coefficient change should increment the version and add tests.
- Keep prior recommendation evidence so decisions remain reproducible.
- Re-review this card whenever data sources, score terms, candidate bounds, or
  automated authority change.
