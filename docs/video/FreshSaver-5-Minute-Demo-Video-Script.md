# FreshSaver 5-Minute Demo Video Script

Target runtime: **4:45**

Narration: **529 words**

## Requirement Coverage

| Requirement | Time | Evidence |
|---|---|---|
| Problem being solved | 00:00–00:52 | Sourced waste scale plus the local expiry-pricing decision |
| How the solution works | 00:52–01:15 | Inventory → prediction → policy → approval → shopper |
| Key features and functionality | 01:15–02:20 and 03:12–04:15 | Owner, products, customers, pricing, marketplace, account |
| Role of AI | 02:20–03:48 | XGBoost, deterministic optimizer, Gemini/template, provenance |
| Live product demonstration | 00:52–04:15 | Production Vercel app and connected Render model |

## Pre-Recording Checklist

- Open https://freshsaver-demand-model.onrender.com/health once to warm the free Render service.
- Use a 1920×1080 recording canvas and browser zoom around 85–90%.
- Hide bookmarks, notifications, personal tabs, passwords, and developer tokens.
- Open the deck at Slide 1, plus browser tabs for https://freshsaver-ai.vercel.app/, /login, /dashboard, /dashboard/products, /dashboard/customers, /dashboard/pricing, /deals, /auth/login, and /account.
- Confirm the owner and shopper demo buttons work in a private browser window.
- Run the agent once before recording so a pending XGBoost recommendation exists as backup.
- Do not enter real card data. Checkout is explicitly a mock payment experience.
- Keep the “Synthetic data” label visible whenever the credential-free demo is shown.

## Script

### Scene 1: 00:00–00:22 — Problem being solved

**Screen:** PowerPoint: docs/deck/FreshSaver-AI-Builders-Hackathon.pptx → Slide 1 — “Fresh today. Expired tomorrow. Wasted forever.”

**Action:** Begin on the full-screen cover. Pause on the supermarket food-waste image before speaking. Keep the image attribution visible.

**Narration (48 words):**

> At closing time, a neighborhood grocer still has milk, spinach, bread, and meat approaching their expiry dates. The food is still usable and still valuable, but the window to sell it is closing. The owner has to decide: hold the price, discount now, or risk throwing it away.

**Suggested overlay:** Fresh today. Expired tomorrow. Wasted forever.

### Scene 2: 00:22–00:52 — Problem scale and impact

**Screen:** PowerPoint: docs/deck/FreshSaver-AI-Builders-Hackathon.pptx → Slide 2 — “The waste is global. The decision is local.”

**Action:** Reveal each sourced number from left to right: 1.05B tonnes, roughly US$1T, 8–10% of GHG emissions, 12% at retail, and the EU date-marking estimate.

**Narration (73 words):**

> UNEP reports 1.05 billion tonnes of food waste in 2022 across households, food service, and retail, with retail responsible for 12 percent. Food loss and waste cost the global economy roughly one trillion US dollars a year and generate 8 to 10 percent of greenhouse-gas emissions. Separately, the European Commission estimates that up to 10 percent of annual EU food waste is linked to date marking. FreshSaver focuses on the retailer’s decision window.

**Suggested overlay:** UNEP Food Waste Index 2024 • European Commission date-marking study

### Scene 3: 00:52–01:15 — Solution overview

**Screen:** https://freshsaver-ai.vercel.app/ → Public landing page

**Action:** Switch from slides to the live landing page. Scroll from the hero to “Make prevention easier than disposal,” then stop at the three-step mission cards.

**Narration (43 words):**

> FreshSaver acts before food becomes surplus. It combines inventory, expiry, recent demand, unit economics, owner approval, and shopper activation in one workflow. The goal is not the deepest discount. It is the right intervention, early enough to protect value and find a buyer.

**Suggested overlay:** Detect risk → choose intervention → connect a buyer

### Scene 4: 01:15–01:40 — Target users and owner experience

**Screen:** https://freshsaver-ai.vercel.app/login → Then https://freshsaver-ai.vercel.app/dashboard

**Action:** Click “Enter demo owner account.” On Dashboard, point to Active Products, Expiring in 30 Days, Active Deals, Deal Subscribers, and the upcoming-expiry queue.

**Narration (39 words):**

> The primary user is an independent grocery owner. One-click demo access opens a store-scoped dashboard showing active products, inventory approaching expiry, live deals, subscribers, and the next products needing attention. Every query is restricted to the owner’s assigned store.

**Suggested overlay:** Store-scoped owner portal

### Scene 5: 01:40–02:00 — Key feature: inventory

**Screen:** https://freshsaver-ai.vercel.app/dashboard/products → Briefly open https://freshsaver-ai.vercel.app/dashboard/products/upload

**Action:** Show the product list columns. Point to original price, current price, discount, expiry status, Add Product, and Import CSV. Do not upload during the recording.

**Narration (37 words):**

> Owners can add products manually or import their existing CSV. FreshSaver validates dates, prices, stock, duplicate SKUs, unit cost, minimum price, and disposal cost. The product table turns that data into a live expiry and pricing view.

**Suggested overlay:** CSV-first onboarding • no new shelf hardware

### Scene 6: 02:00–02:20 — Key feature: customer consent

**Screen:** https://freshsaver-ai.vercel.app/dashboard/customers → Optional second tab: https://freshsaver-ai.vercel.app/store/willow-pine-market

**Action:** Show the customer table and point to interests, opt-in source, and status. Briefly show the store-profile “Notify me about deals” action if time allows.

**Narration (40 words):**

> The customer database is also store-specific. Shoppers opt in on a store page or through an in-store QR journey. Owners see the consent source and category interests, so a dairy offer reaches dairy subscribers instead of becoming a broad promotion.

**Suggested overlay:** Explicit store opt-in • category matching

### Scene 7: 02:20–03:12 — Role of AI and live demonstration

**Screen:** https://freshsaver-ai.vercel.app/dashboard/pricing → Before recording, warm https://freshsaver-demand-model.onrender.com/health

**Action:** Click “Run Agent Now.” Keep the progress line visible: loading products, forecasting demand, preparing discounts, and campaign copy. When cards appear, select an XGBoost recommendation.

**Narration (86 words):**

> This is the live pricing agent. For each near-expiry product, XGBoost predicts sell-through under every allowed price and returns a low, expected, and high range plus feature contributions. A deterministic optimizer then applies the merchant’s price floor, unit cost, disposal cost, expiry rules, and maximum discount. Gemini can translate the fixed evidence into a manager summary and campaign message, but it cannot change the price. If Gemini is unavailable, FreshSaver records a template fallback instead. The scan creates pending recommendations; it does not silently publish them.

**Suggested overlay:** XGBoost predicts • policy constrains • owner controls

### Scene 8: 03:12–03:48 — Explainability and approval

**Screen:** https://freshsaver-ai.vercel.app/dashboard/pricing → Pending AI recommendation card

**Action:** Point to model provider, model version, training provenance, predicted range, clearance probability, expected margin, and top factors. Show Approve & Notify and Reject. Preserve shared demo state unless email delivery is configured.

**Narration (53 words):**

> Every recommendation shows where it came from. The owner can inspect the predicted range, clearance probability, expected margin, top model factors, model version, and whether generation used Gemini or the fallback. The recommendation remains pending until the owner approves or rejects it. Approval publishes the price, records the reviewer, and activates matching shoppers.

**Suggested overlay:** No black box • no silent price change

### Scene 9: 03:48–04:15 — Customer outcome

**Screen:** https://freshsaver-ai.vercel.app/deals → Then https://freshsaver-ai.vercel.app/auth/login and https://freshsaver-ai.vercel.app/account

**Action:** Switch to Deals and open an approved product. Show price, store, and stock. Use “Continue as demo shopper,” then briefly show the account/order-history screen.

**Narration (40 words):**

> Approved offers appear in the customer marketplace with the store, current price, stock, and pickup context. The cart is restricted to one store, and checkout re-reads price and availability from the database. Customers can then see their store-scoped order history.

**Suggested overlay:** Approved deal → local shopper → pickup workflow

### Scene 10: 04:15–04:45 — Impact, value proposition, and close

**Screen:** PowerPoint: docs/deck/FreshSaver-AI-Builders-Hackathon.pptx → Slide 10 — “Pilot, measure, then scale.”

**Action:** Return to the closing slide. Pause on the live-demo link and roadmap. End before 04:45 and leave five seconds of clean video tail.

**Narration (70 words):**

> FreshSaver is live today: a public marketplace, a store-scoped owner portal, a remote XGBoost model, and a human approval loop. For stores, the value is earlier action and margin-aware pricing. For shoppers, it is affordable local food. For the food system, it is another chance to sell usable inventory before it becomes waste. The next milestone is a controlled store pilot that measures forecast quality, margin, sell-through, and actual waste.

**Suggested overlay:** Detect risk. Protect margin. Reach the right shopper.

## Recovery Lines

| Situation | Response |
|---|---|
| Render cold start | Open /health, wait for status 200, then restart the Pricing Log scene. |
| Agent takes too long | Use the already-generated pending recommendation and say the scan was pre-run for recording continuity. |
| Gemini unavailable | Point to “template fallback” and explain that pricing is XGBoost plus deterministic policy, independent of Gemini. |
| Brevo unavailable | Do not claim an email was delivered. Say approval prepares the campaign and provider delivery is optional. |
| Database issue | Switch to /demo and continue with the clearly labeled synthetic fallback workflow. |
| Asked for ROI | No causal ROI is claimed. The next milestone is a controlled merchant pilot. |

## Sources Used In The Opening

- UNEP Food Waste Index Report 2024: https://www.unep.org/resources/publication/food-waste-index-report-2024
- UNEP key findings: https://www.unep.org/news-and-stories/press-release/world-squanders-over-1-billion-meals-day-un-report
- European Commission date-marking study: https://food.ec.europa.eu/food-safety/food-waste/eu-actions-against-food-waste/date-marking-and-food-waste-prevention_en

Do not say that all global food waste is caused by expiry dates. The date-marking estimate is EU-specific.
