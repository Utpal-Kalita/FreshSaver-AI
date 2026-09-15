# Product Requirements Document
## FreshSaver — Customer-Facing Storefront App

> Archived customer concept specification. Use `README.md` and the implemented
> routes as the source of truth for the hackathon submission.

**Version:** 1.1  
**Author:** Prantik Baruah / Growvaa  
**Status:** In Development  
**Last Updated:** April 2026  
**Depends On:** FreshSaver-PRD.md (admin backend), `002_customer_access.sql` (migration)

---

## Changelog

| Version | Change |
|---|---|
| 1.0 | Initial customer app PRD |
| 1.1 | Updated to match `002_customer_access.sql` — `products_public` view, new product columns (brand, description, unit, stock_quantity), corrected RLS policies, removed expiry date from all customer-facing UI |

---

## 1. Overview

### 1.1 Product Summary

The **FreshSaver Customer App** is a public-facing, mobile-first storefront that showcases near-expiry discounted products to end customers. It surfaces deals from the automated AI scan engine — presenting them as Flash Deals, Last Chance offers, and category-filtered browsing.

The app is a Next.js frontend served from the same Vercel deployment as the admin backend, using Supabase as the data layer. **All customer queries go through the `products_public` view** — a restricted projection of the `products` table that deliberately hides internal fields including `expiry_date`.

### 1.2 Core Value Proposition

> "Shop smarter. Products nearing expiry — deeply discounted, delivered fast."

### 1.3 Design Philosophy

- **Mobile-first** — optimized for phone browsers; app-like feel
- **Urgency by design** — tier badges, "within X days" cues, stock levels at every touchpoint
- **Zero friction** — browse without login; subscribe in one tap
- **Speed** — ISR-cached deal pages; under 1.5s LCP on mobile
- **Professional & trustworthy** — clean design, clear pricing, no dark patterns
- **Privacy-conscious** — expiry dates never exposed to customers; urgency communicated through tiers only

---

## 2. Goals & Success Metrics

### 2.1 Goals

| Goal | Description |
|---|---|
| Drive deal conversions | Turn near-expiry stock into revenue via urgency-led UX |
| Grow subscriber base | Capture emails for ongoing deal notifications |
| Reduce bounce rate | Keep users engaged with product detail, brand info, descriptions |
| Build brand trust | Clear savings display, stock indicators, professional UI |

### 2.2 Success Metrics

| Metric | Target |
|---|---|
| Homepage LCP | < 1.5s (mobile, 4G) |
| Deal page load | < 1.0s (ISR cached) |
| Email subscription conversion | > 8% of visitors |
| Click-through on Flash Deals | > 25% of deal card views |
| Mobile bounce rate | < 40% |
| Accessibility score | > 90 (Lighthouse) |

---

## 3. User Personas

### 3.1 The Deal Hunter
- Actively looks for discounts on groceries, supplements, cosmetics
- Checks category pages regularly; filters by brand or unit size
- Subscribes to alerts so they don't miss flash deals

### 3.2 The Casual Browser
- Discovers the app via social sharing or email
- Needs a visually compelling homepage — hero banner hooks them in
- Converts when a deal feels genuinely urgent + the product description convinces them

### 3.3 The Subscriber
- Already registered for email alerts
- Arrives via email CTA with direct intent to buy
- Wants the product page immediately — no friction

---

## 4. Site Architecture & Routes

```
/ (public — all routes use products_public view via anon key)
├── /                         Landing Page (homepage)
├── /deals                    All Active Deals
├── /deals/flash              Flash Deals (Tier 2 — ≤ 15 days)
├── /deals/expiring-soon      Expiring Soon (Tier 1 — ≤ 30 days)
├── /categories               Category Browser
├── /categories/[slug]        Category Product Listing
├── /products/[sku]           Product Detail Page
├── /subscribe                Email Subscription Page
└── /unsubscribe              Unsubscribe (via token in query param)
```

All routes are **public** — no customer login required. Subscription is opt-in.

---

## 5. Pages & Features

---

### 5.1 Homepage (`/`)

#### 5.1.1 Hero Banner (Full-Width)

- Full-bleed responsive banner with gradient overlay
- Rotates between **2–4 banners** from the `banners` table (seeded with 3 defaults in `002_customer_access.sql`)
- Each banner contains:
  - `gradient` field used as Tailwind class for background (fallback when no `image_url`)
  - `image_url` as optional background image
  - `title` → headline
  - `subtitle` → subheadline
  - `cta_label` + `cta_href` → CTA button
- Auto-rotates every 5 seconds; swipe on mobile
- Dot indicator for manual navigation
- Queried from `banners` table via anon policy (only `is_active = TRUE`, ordered by `sort_order`)

**Seeded banners (from migration):**
1. "Up to 25% Off Before They're Gone" — red/orange gradient → `/deals/flash`
2. "Save Big on Groceries & Supplements" — emerald gradient → `/deals`
3. "Never Miss a Deal" — violet gradient → `/subscribe`

#### 5.1.2 Stats Bar

Animated counter strip beneath the hero:
- `X+ Products on Sale` (count from `products_public`)
- `Up to 25% Off`
- `Updated Every 48 Hours`
- `Free Email Alerts`

#### 5.1.3 Flash Deals Section

**Title:** "Flash Deals — Hurry, Limited Time!"

- Horizontally scrollable on mobile; 4-column grid on desktop
- Shows top 8 products with `discount_tier = 'tier_2'`
- Sorted by `created_at DESC` (newest discounted first — no expiry date available in view)
- Each card shows:
  - Product image (`image_url`) or placeholder
  - Brand + product name
  - Unit (e.g., "500ml", "1kg")
  - Category badge
  - Original price (strikethrough) + discounted price (bold, accent)
  - Discount % badge (calculated: `((original_price - discounted_price) / original_price * 100)`)
  - **"FLASH DEAL — Within 15 Days"** urgency label (red badge) — no exact date shown
  - Stock indicator if `stock_quantity > 0` and `< 10`: "Only X left!"
- Tapping → `/products/[sku]`
- "View All Flash Deals →" at section end

#### 5.1.4 Categories Section

**Title:** "Shop by Category"

- 2×N grid on mobile; horizontal row on desktop
- Each tile shows: icon, category name, deal count ("14 deals")
- Categories derived dynamically: `SELECT DISTINCT category FROM products_public`
- Deal count = `COUNT(*) WHERE category = ?`
- Tapping → `/categories/[slug]`

**Icon mapping:**

| Category | Icon |
|---|---|
| Grocery | 🛒 |
| Supplements | 💊 |
| Pharma | 💉 |
| Cosmetics | 💄 |
| Beverages | 🥤 |
| Dairy | 🥛 |
| Snacks | 🍿 |
| Baby | 👶 |
| Pet Food | 🐾 |
| *(default)* | 📦 |

#### 5.1.5 Expiring Soon Section

**Title:** "Expiring Soon — Grab Before They're Gone"

- 2-column grid on mobile; 4-column on desktop
- Shows top 8 products with `discount_tier = 'tier_1'`
- Same card layout as Flash Deals but with **"EXPIRING SOON — Within 30 Days"** amber badge
- "View All →" link at section end

#### 5.1.6 Email Subscribe Banner

- Headline: "Never Miss a Deal"
- Subheadline: "Get notified when new flash deals drop — straight to your inbox."
- Email input + "Subscribe" button
- Privacy note: "We only send deal alerts. Unsubscribe anytime."
- On submit → `POST /api/customers` → success toast
- If already subscribed → "You're already on the list!"

#### 5.1.7 Footer

- FreshSaver logo + tagline
- Links: All Deals / Flash Deals / Categories / Subscribe / Unsubscribe
- "Powered by FreshSaver AI"

---

### 5.2 All Deals Page (`/deals`)

- **Filter bar** (sticky):
  - Category filter (multi-select pill chips — values from `products_public`)
  - Sort: "Biggest Discount" / "Lowest Price" / "Highest Savings" / "Newest"
  - Deal type: "All" / "Flash Deals Only" / "Expiring Soon Only"
- Product grid: 2-col mobile, 3-col tablet, 4-col desktop
- "Load More" pagination — 20 products per page
- Empty state: "No active deals right now. Check back after our next scan!"
- Deal count: "Showing 43 active deals"

---

### 5.3 Flash Deals Page (`/deals/flash`)

- Pre-filtered to `discount_tier = 'tier_2'`
- Urgency header: red gradient + "These deals end within 15 days!"
- Same filter/sort bar (category + sort)
- Empty state: "No flash deals right now — check Expiring Soon for more savings!"

---

### 5.4 Expiring Soon Page (`/deals/expiring-soon`)

- Pre-filtered to `discount_tier = 'tier_1'`
- Amber color scheme header: "Save now before these deals upgrade to Flash status"
- Same filter/sort bar

---

### 5.5 Categories Page (`/categories`)

- Large visual category tiles
- Each shows: icon, name, deal count, cheapest deal ("From ₹XX")
- Sorted by deal count descending

---

### 5.6 Category Listing Page (`/categories/[slug]`)

- All active deals in the category (from `products_public WHERE category = ?`)
- Breadcrumb: Home → Categories → Grocery
- Category header: icon + name + deal count
- Same grid + filter bar
- Related categories at bottom

---

### 5.7 Product Detail Page (`/products/[sku]`)

The primary conversion page. Reached from emails, deal cards, direct links.

All data sourced from `products_public` view. **Expiry date is not shown anywhere on this page** — urgency is communicated through the tier badge and stock level only.

#### Layout (Mobile: stacked top-to-bottom | Desktop: image left, info right)

**Image Panel**
- `image_url` if present; else branded placeholder with category icon
- Tier badge overlaid on image corner: `[⚡ FLASH DEAL]` or `[⏰ EXPIRING SOON]`

**Info Panel**

| Element | Source Field | Display |
|---|---|---|
| Brand | `brand` | Small muted text above product name |
| Product Name | `product_name` | H1, large, bold |
| Unit | `unit` | Muted tag next to name (e.g., "500ml") |
| Category Badge | `category` | Pill chip |
| Tier Badge | `discount_tier` | "FLASH DEAL" (red) or "EXPIRING SOON" (amber) |
| Savings Badge | computed | "You save ₹306 — 23% OFF" — green accent box |
| Discounted Price | `discounted_price` | Large, bold, brand primary color |
| Original Price | `original_price` | Strikethrough, muted |
| MRP | `mrp` | "MRP: ₹1,599" — small |
| Urgency Message | `discount_tier` | tier_2: "⚡ This deal ends within 15 days" / tier_1: "⏰ Deal valid for up to 30 days" |
| Stock Indicator | `stock_quantity` | If `stock_quantity > 0 && < 10`: "Only X left at this price!" (amber) / If `stock_quantity = 0`: "Check in-store" |
| Description | `description` | Paragraph, shown if not null |
| CTA Button | — | **"Buy Now"** → `NEXT_PUBLIC_STORE_URL/products/{sku}` (new tab) |
| Subscribe CTA | — | "Get alerts for deals like this →" → inline email popover |

> **Note:** Expiry date (`expiry_date`) is intentionally absent — it exists in the `products` table but is excluded from the `products_public` view queried by the customer app.

#### Related Deals

- "More deals in [Category]" — 4 horizontal scroll cards
- Queried from `products_public WHERE category = ? AND sku != current_sku`

---

### 5.8 Subscribe Page (`/subscribe`)

- Name (optional) + Email (required)
- Category preferences: multi-select checkboxes (same category list from DB)
  - Stored in `customers.subscribed_categories TEXT[]`
  - Empty = subscribed to all
- "Subscribe to Deal Alerts" CTA
- Submits to `POST /api/customers`
- Success: "You're subscribed! Expect alerts at the next scan cycle."

---

### 5.9 Unsubscribe Page (`/unsubscribe`)

- URL format: `/unsubscribe?token={unsubscribe_token}` (UUID from `customers.unsubscribe_token`)
- The `unsubscribe_token` column was added in `002_customer_access.sql` with a unique index
- UI shows: "Unsubscribe {email} from FreshSaver deal alerts?"
- "Confirm Unsubscribe" → `POST /api/customers/unsubscribe?token=...`
  - Sets `customers.is_subscribed = false`, `customers.unsubscribed_at = NOW()`
- Success: "You've been unsubscribed. We'll miss you!"
- Re-subscribe CTA shown post-confirmation

---

## 6. API Endpoints (Customer-Facing, Public)

All public endpoints use the **Supabase anon key**. All queries target the `products_public` view, not the `products` table directly.

| Method | Route | Description | Source |
|---|---|---|---|
| `GET` | `/api/public/deals` | Paginated deals (tier_1 + tier_2) | `products_public` |
| `GET` | `/api/public/deals/flash` | Tier 2 only | `products_public` |
| `GET` | `/api/public/deals/expiring-soon` | Tier 1 only | `products_public` |
| `GET` | `/api/public/categories` | Categories + deal counts | `products_public` |
| `GET` | `/api/public/categories/[slug]` | Products in a category | `products_public` |
| `GET` | `/api/public/products/[sku]` | Single product detail | `products_public` |
| `GET` | `/api/public/banners` | Active banners ordered by `sort_order` | `banners` |
| `GET` | `/api/public/stats` | Total deal count, max discount % | `products_public` |
| `POST` | `/api/customers` | Subscribe (anon INSERT allowed by RLS) | `customers` |
| `POST` | `/api/customers/unsubscribe` | Unsubscribe via token | `customers` |

**Rate Limiting:** 60 req/min per IP via Next.js middleware on all `/api/public/*` routes.

---

## 7. Database — What Was Added in `002_customer_access.sql`

### 7.1 New Columns on `products`

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit           TEXT DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS brand          TEXT;
```

| Column | Type | UI Usage |
|---|---|---|
| `description` | TEXT | Product detail page body text |
| `stock_quantity` | INTEGER | "Only X left!" urgency indicator |
| `unit` | TEXT | Shown on card + detail (e.g., "500ml", "1kg", "piece") |
| `brand` | TEXT | Above product name on detail page + card subtitle |

### 7.2 New Columns on `customers`

```sql
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS unsubscribed_at   TIMESTAMPTZ;
```

- `unsubscribe_token` — UUID, unique index; embedded in email unsubscribe links as `?token=`
- `unsubscribed_at` — recorded when customer confirms unsubscribe

### 7.3 `banners` Table

```sql
CREATE TABLE banners (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  image_url  TEXT,
  gradient   TEXT DEFAULT 'from-emerald-600 to-teal-700',  -- Tailwind class
  cta_label  TEXT DEFAULT 'Shop Now',
  cta_href   TEXT DEFAULT '/deals',
  is_active  BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3 default banners seeded in migration. Admins manage via `/dashboard/banners`.

### 7.4 `products_public` View (Critical)

```sql
CREATE OR REPLACE VIEW products_public AS
SELECT
  id, product_name, sku, brand, description, unit, stock_quantity,
  original_price, mrp, discounted_price,
  category, image_url, discount_tier,
  is_active, created_at, updated_at
FROM products
WHERE is_active = TRUE AND is_expired = FALSE;
```

**Deliberately excluded columns:**

| Column | Why Excluded |
|---|---|
| `expiry_date` | Not shown to customers by design |
| `price_history` | Internal admin data |
| `excluded_from_scan` | Internal admin flag |
| `manual_override_price` | Internal admin field |
| `is_expired` | View already filters these out (`WHERE is_expired = FALSE`) |

> **All customer-facing components must query `products_public`, never `products` directly.**

### 7.5 RLS Policies Added

| Table | Role | Permission | Condition |
|---|---|---|---|
| `products` | `anon` | SELECT | `is_active = TRUE AND is_expired = FALSE` |
| `customers` | `anon` | INSERT | any (for subscribe) |
| `customers` | `anon` | UPDATE | any (for unsubscribe via token) |
| `banners` | `anon` | SELECT | `is_active = TRUE` |
| `banners` | `authenticated` | ALL | any (admin management) |

### 7.6 New Indexes

```sql
-- Speeds up category browsing on customer-facing pages
CREATE INDEX idx_products_category
  ON products (category)
  WHERE is_active = TRUE AND is_expired = FALSE;

-- Speeds up tier + sort queries on deal pages
CREATE INDEX idx_products_discount_tier_active
  ON products (discount_tier, expiry_date)
  WHERE is_active = TRUE AND is_expired = FALSE;

-- Speeds up banner carousel query
CREATE INDEX idx_banners_active
  ON banners (sort_order)
  WHERE is_active = TRUE;
```

---

## 8. UI Component Library

All components in `components/customer/`. Built with Tailwind CSS.

| Component | File | Description |
|---|---|---|
| `DealCard` | `DealCard.tsx` | Card with brand, name, unit, price, tier badge, stock indicator |
| `HeroBanner` | `HeroBanner.tsx` | Auto-rotating carousel from `banners` table |
| `CategoryGrid` | `CategoryGrid.tsx` | Icon tile grid with deal counts |
| `TierBadge` | `TierBadge.tsx` | "FLASH DEAL" / "EXPIRING SOON" pill |
| `PriceDisplay` | `PriceDisplay.tsx` | Discounted / original / MRP with savings badge |
| `StockIndicator` | `StockIndicator.tsx` | "Only X left!" or hidden if stock ≥ 10 |
| `FilterBar` | `FilterBar.tsx` | Category + sort + type filter bar |
| `SubscribeForm` | `SubscribeForm.tsx` | Inline email capture form |
| `StatsBar` | `StatsBar.tsx` | Animated stat counters |
| `ProductImage` | `ProductImage.tsx` | Image with branded category-icon fallback |

### 8.1 Design Tokens

```js
// tailwind.config.js
colors: {
  brand: {
    primary: '#10B981',  // Emerald — fresh, deals, trust
    flash:   '#EF4444',  // Red — Flash Deal urgency
    warning: '#F59E0B',  // Amber — Expiring Soon
    dark:    '#111827',  // Gray 900
    muted:   '#6B7280',  // Gray 500
  }
}
```

### 8.2 Typography Scale

| Use | Class |
|---|---|
| Page titles | `text-3xl font-bold tracking-tight` |
| Section headers | `text-xl font-semibold` |
| Brand name | `text-xs font-medium text-brand-muted uppercase tracking-widest` |
| Product names | `text-base font-medium` |
| Unit tag | `text-xs text-brand-muted` |
| Prices (discounted) | `text-2xl font-bold text-brand-primary` |
| Prices (original) | `text-sm line-through text-brand-muted` |
| Badges | `text-xs font-bold uppercase tracking-wide` |

---

## 9. Key UI/UX Patterns

### 9.1 Deal Card — Anatomy

```
┌─────────────────────────────────┐
│  [⚡ FLASH DEAL]     [−23%]     │  ← tier badge + discount %
│                                 │
│         [Product Image]         │  ← 200px, Next.js <Image>
│                                 │
│  GNC · 500ml                    │  ← brand · unit (muted)
│  Whey Protein Chocolate         │  ← product name
│  [Supplements]                  │  ← category badge
│                                 │
│  ₹993    ~~₹1,299~~  MRP₹1,599 │  ← pricing
│  ✅ You save ₹306               │
│                                 │
│  ⚡ Within 15 days · Only 3 left│  ← urgency row
└─────────────────────────────────┘
```

### 9.2 Urgency Signals (Tier-Based — No Exact Date)

Since `expiry_date` is excluded from `products_public`, urgency is communicated through `discount_tier` and `stock_quantity`:

| Signal | Trigger | Display |
|---|---|---|
| "FLASH DEAL" badge | `discount_tier = 'tier_2'` | Red pill, bold |
| "EXPIRING SOON" badge | `discount_tier = 'tier_1'` | Amber pill |
| "Within 15 days" text | `discount_tier = 'tier_2'` | Red text on card |
| "Within 30 days" text | `discount_tier = 'tier_1'` | Amber text on card |
| "Only X left!" | `stock_quantity > 0 && < 10` | Amber alert |
| "Check in-store" | `stock_quantity = 0` | Gray muted text |
| "⚡ Deal ends soon!" | `discount_tier = 'tier_2'` | Product detail urgency box |

> No countdown timers showing exact hours/minutes — those require `expiry_date` which is not in the view. Use tier-based messaging instead.

### 9.3 Stock Quantity Display Rules

```typescript
function stockLabel(qty: number): string | null {
  if (qty === 0) return 'Check in-store';
  if (qty < 5)  return `Only ${qty} left — grab it now!`;
  if (qty < 10) return `Only ${qty} left at this price`;
  return null; // plenty of stock — don't show anything
}
```

---

## 10. Data Fetching Strategy

### 10.1 Rendering Strategy

| Page | Strategy | Revalidation |
|---|---|---|
| `/` | ISR | 3600s (1h) |
| `/deals` | ISR | 1800s (30m) |
| `/deals/flash` | ISR | 900s (15m) |
| `/deals/expiring-soon` | ISR | 1800s (30m) |
| `/categories` | ISR | 3600s |
| `/categories/[slug]` | ISR | 1800s |
| `/products/[sku]` | ISR | 600s (10m) |
| Subscribe/Unsubscribe forms | Client Component | N/A |
| Banner carousel (auto-rotate) | Client Component | N/A |

### 10.2 Supabase Public Queries

**Always use `products_public` view, never `products` table:**

```typescript
import { createClient } from '@supabase/supabase-js';

// Public client — anon key only, safe for server components
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Flash deals (homepage section)
const { data: flashDeals } = await supabase
  .from('products_public')
  .select('id, product_name, sku, brand, unit, category, image_url, original_price, mrp, discounted_price, discount_tier, stock_quantity')
  .eq('discount_tier', 'tier_2')
  .order('created_at', { ascending: false })
  .limit(8);

// Product detail
const { data: product } = await supabase
  .from('products_public')
  .select('*')
  .eq('sku', sku)
  .single();

// Categories with counts
const { data: products } = await supabase
  .from('products_public')
  .select('category');
// Group by category client-side or use a Supabase RPC

// Banners
const { data: banners } = await supabase
  .from('banners')
  .select('*')
  .eq('is_active', true)
  .order('sort_order');
```

---

## 11. Page-Level Wireframes

### 11.1 Homepage (Mobile)

```
┌──────────────────────┐
│  🍃 FreshSaver       │  ← Nav (logo + Deals link)
├──────────────────────┤
│                      │
│    [HERO BANNER]     │  ← gradient bg, rotating
│  "Up to 25% Off"     │
│  [Shop Flash Deals]  │
│   ● ● ○ (dots)       │
│                      │
├──────────────────────┤
│ 43 Deals │ 25% Off   │  ← Stats bar
│ 48h Scan │ Free Alert│
├──────────────────────┤
│ ⚡ Flash Deals       │
│ [card][card][card]→  │  ← horizontal scroll
├──────────────────────┤
│ 🗂 Shop by Category  │
│ [🛒 Grocery  12]     │  ← icon + name + count
│ [💊 Supps    8 ]     │
│ [💄 Beauty   5 ]     │
├──────────────────────┤
│ ⏰ Expiring Soon     │
│ [card][card]         │  ← 2-col grid
│ [card][card]         │
│ [View All →]         │
├──────────────────────┤
│ 📧 Never Miss a Deal │
│ [email        ] [→]  │
│ Unsubscribe anytime  │
├──────────────────────┤
│ FreshSaver © 2026    │
└──────────────────────┘
```

### 11.2 Product Detail Page (Mobile)

```
┌──────────────────────┐
│ ← Back to Deals      │
├──────────────────────┤
│  [⚡ FLASH DEAL]     │  ← badge overlaid on image
│  [Product Image]     │
├──────────────────────┤
│ GNC                  │  ← brand (muted, small)
│ Whey Protein 1kg     │  ← H1
│ 500ml [Supplements]  │  ← unit + category badge
│                      │
│ ₹993                 │  ← discounted price
│ ~~₹1,299~~  MRP₹1,599│
│ ✅ You save ₹306 (23%)│
│                      │
│ ⚡ Deal ends within  │  ← tier-based urgency
│    15 days           │  ← NO exact date shown
│                      │
│ ⚠️ Only 3 left!      │  ← stock_quantity < 5
│                      │
│ [     BUY NOW     ]  │  ← primary CTA → STORE_URL
│ [Get deal alerts →]  │  ← subscribe popover
├──────────────────────┤
│ About this product   │
│ Description text...  │  ← description field
├──────────────────────┤
│ More in Supplements  │
│ [card][card][card]→  │
└──────────────────────┘
```

---

## 12. Environment Variables

No new vars needed beyond what's already configured.

```env
# Public Supabase (already set) — used for anon queries to products_public + banners
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Store URL for BUY NOW CTA
NEXT_PUBLIC_STORE_URL=https://yourstore.com

# App branding
NEXT_PUBLIC_APP_NAME=FreshSaver
NEXT_PUBLIC_APP_TAGLINE=Shop smarter. Save more.
```

---

## 13. Customer-Side Data Flow

```
Customer visits /                        (ISR, anon Supabase)
  └─→ Sees banners                       (banners table, anon SELECT policy)
  └─→ Sees Flash Deals                   (products_public WHERE tier='tier_2')
  └─→ Sees Categories + counts           (products_public GROUP BY category)
  └─→ Sees Expiring Soon                 (products_public WHERE tier='tier_1')

Customer clicks a deal card
  └─→ /products/[sku]                    (ISR, products_public WHERE sku=?)
  └─→ Sees description, brand, unit      (new columns from 002_customer_access.sql)
  └─→ Sees stock indicator               (stock_quantity column)
  └─→ "Buy Now" → STORE_URL/products/sku (external link)

Customer subscribes
  └─→ POST /api/customers                (anon INSERT policy on customers table)
  └─→ 48h later: AI scan runs
  └─→ Brevo sends email with deal        (unsubscribe_token in email link)
  └─→ Customer clicks CTA → /products/[sku]

Customer unsubscribes
  └─→ Clicks email link: /unsubscribe?token={unsubscribe_token}
  └─→ POST /api/customers/unsubscribe?token=...
  └─→ UPDATE customers SET is_subscribed=false, unsubscribed_at=NOW()
      WHERE unsubscribe_token = ? (anon UPDATE policy allows this)
```

---

## 14. Admin Additions

### 14.1 Banner Management (`/dashboard/banners`)

| Feature | Description |
|---|---|
| View all banners | List with title, gradient preview, active status |
| Add banner | title, subtitle, image_url, gradient, cta_label, cta_href |
| Edit banner | Any field |
| Toggle active | Instant enable/disable |
| Reorder | Drag `sort_order` |

### 14.2 Product Data Completeness

Since `description`, `brand`, `unit`, `stock_quantity` are new nullable columns, the admin `products` upload flow should:
- Accept these as **optional CSV columns** (add to import spec)
- Show "incomplete" badge in product table if `description` is null
- Allow editing from `/dashboard/products/[sku]`

---

## 15. SEO & Performance

| Page | Title | Meta Description |
|---|---|---|
| `/` | "FreshSaver — Deals on Near-Expiry Products" | "Save up to 25% on groceries, supplements, and more. Deals refreshed every 48 hours." |
| `/deals` | "All Active Deals — FreshSaver" | "Browse X active discounts. New deals added every 48 hours." |
| `/deals/flash` | "Flash Deals — Limited Time Savings" | "Products expiring within 15 days — deeply discounted." |
| `/products/[sku]` | `{brand} {product_name} {unit} — Save X% \| FreshSaver` | Dynamic: brand + name + discount % |

**Open Graph tags** on product pages: `image_url`, product name, discount %, brand.

**Performance:**
- `<Image />` for all product images — WebP, lazy, sized
- ISR caching — zero DB hit per page view
- Anon Supabase client — no auth overhead
- No third-party scripts on the critical render path

---

## 16. Accessibility

- `alt={product_name}` on all product images; `alt=""` on decorative images
- Urgency badges always have text ("FLASH DEAL") — never color alone
- Stock indicator uses both color and text
- Focus-visible ring on all interactive elements
- Touch targets ≥ 44×44px on mobile
- Contrast ratio ≥ 4.5:1 for all body text

---

## 17. Edge Cases

| Scenario | Handling |
|---|---|
| Product has no `description` | Section hidden — not shown as blank |
| Product has no `brand` | Brand line hidden on card and detail page |
| `stock_quantity = 0` | Show "Check in-store" — not "Out of stock" (we don't manage actual inventory) |
| `stock_quantity = null` | Stock indicator hidden entirely |
| No flash deals | "No flash deals right now. Check Expiring Soon →" with link |
| `image_url` returns 404 | `onError` on `<Image>` → fallback category icon placeholder |
| Customer submits email twice | Idempotent: `UNIQUE` on `customers.email` — return "already subscribed" |
| Invalid unsubscribe token | "Invalid or expired link" page with contact email |
| Category slug has no active deals | "No deals in this category right now" + related categories |
| `STORE_URL` not set | "Buy Now" links to `#` with tooltip "Store link not configured" |

---

## 18. Implementation Priority (MVP Order)

| Priority | Feature | Notes |
|---|---|---|
| P0 | `DealCard` component | Uses brand, unit, tier badge, stock, savings % |
| P0 | Homepage — Flash Deals + Categories + Expiring Soon | Core conversion page |
| P0 | Product Detail Page | Description, brand, unit, stock, pricing, CTA |
| P0 | Inline subscribe form | Used on homepage + product detail |
| P1 | Hero Banner carousel | Reads `banners` table |
| P1 | All Deals page + filter bar | Category + sort filters |
| P1 | Flash Deals page | Pre-filtered tier_2 |
| P1 | Category Listing page | `/categories/[slug]` |
| P2 | Subscribe full page | `/subscribe` with category prefs |
| P2 | Unsubscribe page | `/unsubscribe?token=` flow |
| P2 | Banner admin management | `/dashboard/banners` |
| P3 | Categories browser page | `/categories` full page |
| P3 | Related deals on product page | Same category, different SKU |
| P3 | Admin product CSV — new columns | description, brand, unit, stock_quantity in import |

---

## 19. Out of Scope (v1.0)

- Customer accounts / wishlists / order history
- Shopping cart / checkout (BUY NOW links to external store)
- Payment processing
- Exact expiry date shown to customers (by design)
- Real-time inventory sync
- Web push notifications
- Product reviews or ratings
- Full-text product search
- Native mobile app

---

## 20. Open Questions

1. **`STORE_URL` strategy:** Is FreshSaver the store itself, or a deals aggregator linking out? Determines if "Buy Now" is a cart action or an external link.
2. **Stock quantity sync:** `stock_quantity` is manually entered (via CSV or admin). Should it decrement when a buy happens, or is it informational only?
3. **Banner images:** Should admins upload images to Supabase Storage, or paste CDN URLs? Storage upload requires a UI not yet scoped.
4. **Category slugs:** `Pharma & Medicine` → `pharma-medicine`. Define the slugification rule and handle in API.
5. **ISR freshness:** With 1h revalidation, a new scan result takes up to 1h to appear. Acceptable? Could use `revalidatePath` in the scan endpoint to purge immediately.

---

*This PRD governs the customer-facing storefront of FreshSaver v1.1. Refer to `FreshSaver-PRD.md` for the admin backend and `002_customer_access.sql` for the database changes.*
