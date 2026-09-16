# FreshSaver Hackathon Presentation

The final deck contains **9 slides**, below the Devpost maximum of 10.

## Slide 1: Fresh Today. Expired Tomorrow. Wasted Forever.

- Open with a public-domain photograph of discarded supermarket food.
- Introduce FreshSaver as the intervention before inventory reaches that outcome.
- Link to the live product and source.

Speaker note: Food can move from sellable inventory to waste because the decision
came too late. FreshSaver gives the owner an evidence-based action while the product
still has value.

## Slide 2: The Waste Is Global. The Decision Is Local.

- UNEP reports 1.05 billion tonnes of food waste in 2022 across households, food
  service and retail, including inedible parts.
- Retail represented 12% of the total.
- Food loss and waste impose an estimated global economic toll of roughly US$1
  trillion and generate 8–10% of annual global GHG emissions.
- A separate European Commission study estimates that up to 10% of annual EU food
  waste is linked to date marking.

Speaker note: Keep scopes precise. Do not claim that 1.05 billion tonnes are caused
by expiry dates. Bring the global problem back to the local question: hold, markdown,
or lose the stock.

## Slide 3: From Expiring Stock To A Customer's Inbox

The solution flow is:

1. Store imports inventory, expiry and unit economics.
2. XGBoost predicts sell-through for every candidate price.
3. The deterministic optimizer applies price floors, expiry blocks and overrides.
4. Gemini explains the fixed evidence and creates campaign plus recipe copy.
5. The store owner approves or rejects the pending recommendation.
6. FreshSaver matches store-specific, category-specific opt-ins.
7. Brevo sends the approved campaign when configured.
8. The shopper opens the deal, reserves or orders, and the outcome is recorded.

Speaker note: A prediction alone does not rescue food. FreshSaver connects AI to
owner authority, customer activation and an outcome ledger.

## Slide 4: Target Users And Business Model

### Retailers And Grocery Store Owners

- Paying customer
- Protect margin
- Reduce manual expiry checks
- Reach opted-in local demand

### Store Managers And Staff

- Daily operators
- Review recommendations
- Approve or reject
- Track orders and outcomes

### Students And Budget-Conscious Shoppers

- Use the app free
- Discover affordable local deals
- Opt into relevant store alerts
- Receive recipe ideas and pickup options

Proposed model: customers use FreshSaver free; stores pay 10% of attributable
campaign sales with no setup fee. Attribution is not presented as causal lift.

## Slide 5: Product Features

### Owner Portal

- Dashboard and expiry KPIs
- Products, manual entry and CSV import
- Store-specific customer database
- Pricing Log and streamed agent progress
- Orders, email logs and recommendation history

### Decision Intelligence

- Candidate prices and prediction ranges
- Clearance probability and expected margin
- Top XGBoost factors and model provenance
- Recipe and campaign preview
- Approve, reject and override controls

### Shopper Marketplace

- Deals, stores, search, filters and maps
- Store/category opt-in notifications
- Free customer accounts
- Single-store cart and mock checkout
- Pickup context and order history

## Slide 6: AI Technologies Used

### AI 1: XGBoost - Prediction

- What: predicts low, expected and high sell-through for every candidate price.
- Why: grocery demand is nonlinear tabular data involving stock, price, expiry,
  category and sales velocity.

### Deterministic Optimizer - Not AI

- What: selects the strongest eligible contribution score.
- Why: minimum price, expiry, override and discount constraints must remain testable.

### AI 2: Gemini - Language

- What: creates the manager explanation, email copy and a product-specific recipe.
- Why: explanation and communication are language tasks. Gemini never calculates or
  changes the price, and customer PII is never sent to Gemini.

### Store Owner - Human Authority

- What: approves or rejects the recommendation.
- Why: pricing accountability remains with the merchant.

Speaker note: XGBoost predicts, policy constrains, Gemini communicates, and the owner
decides. XGBoost is live. Gemini is optional and has a deterministic template and
recipe fallback.

## Slide 7: Technical Architecture

- Next.js 16 and React 19 customer and owner experiences on Vercel
- Authenticated scan, recommendation and approval APIs
- Supabase Auth, PostgreSQL, RLS and Storage
- XGBoost FastAPI service in Docker on Render
- Deterministic TypeScript optimizer
- Gemini structured generation with safe template fallback
- Brevo email adapter
- Store-specific consent matching
- Vercel Cron for scheduled scans
- Stored recommendation and approval audit trail

Speaker note: `store_id` is the tenant key. Service-role access and provider secrets
remain server-side. The browser is never treated as an authorization boundary.

## Slide 8: Impact And Value Proposition

### For Stores

- Earlier intervention before surplus
- Margin-aware pricing instead of blanket discounts
- Less manual review
- Auditable owner-controlled decisions

### For Students And Budget-Conscious Shoppers

- Free marketplace access
- Affordable local food
- Relevant store and category alerts
- Recipe ideas for approved surplus products

### For The Food System

- Another chance to sell usable inventory
- Measurable sell-through and outcome events
- Future donation and transfer routing

Pilot metrics: kilograms or tonnes diverted, sell-through before expiry, gross
margin, shopper savings and pickup rate. No measured waste-reduction claim is made
before a controlled pilot.

## Slide 9: Future Roadmap

1. Live MVP: owner portal, shopper marketplace, XGBoost and approval workflow.
2. Pilot with 3–5 independent retailers in shadow mode.
3. Measure forecasts, waste, margin, overrides and shopper savings.
4. Learn store/category price elasticity from interventions.
5. Add transactional reservations, real payments and POS feeds.
6. Integrate electronic shelf labels.
7. Add donation routing, store transfers and multi-location policies.

Close: FreshSaver is live today. The next milestone is a controlled merchant pilot,
not blind automation.

## Devpost Requirement Coverage

| Requirement | Slide |
|---|---:|
| Problem Statement | 2 |
| Solution Overview | 3 |
| Target Users | 4 |
| Product Features | 5 |
| AI Technologies Used | 6 |
| Technical Architecture | 7 |
| Impact And Value Proposition | 8 |
| Future Roadmap | 9 |
