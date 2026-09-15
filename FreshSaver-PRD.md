# Product Requirements Document
## AI-Powered Product Expiry Detection & Automated Discount System — FreshSaver

> Archived concept specification. The implemented hackathon product now uses the
> demand forecast and constrained markdown optimizer documented in `README.md` and
> `docs/model-card.md`; references below to Gemini tier classification and fixed
> discounts describe the original concept and are not the current runtime behavior.

**Version:** 2.0  
**Author:** Prantik Baruah / Growvaa  
**Status:** Complete  
**Last Updated:** April 2026

---

## 1. Overview

### 1.1 Product Summary

**FreshSaver** is an AI-powered SaaS module for e-commerce stores that automatically monitors product expiry dates and applies tiered discounts as expiry approaches — with zero manual intervention after initial product listing.

It uses **Google Gemini AI** to analyze product data, **Brevo** (formerly Sendinblue) to send promotional emails to customers, **Supabase** as the backend-as-a-service platform (database, auth, storage, and scheduled functions), and **Vercel** to host the full-stack Next.js application.

### 1.2 Problem Statement

E-commerce stores selling perishable or time-sensitive products (groceries, supplements, cosmetics, pharmaceuticals, etc.) often fail to act on approaching expiry dates in time. Products sit unsold, get wasted, and result in revenue loss — all because there was no system proactively detecting the risk and responding to it.

### 1.3 Solution

An automated pipeline where:
1. Admin logs in via Supabase Auth and uploads a CSV of products
2. The system validates, parses, and stores the data in Supabase (PostgreSQL)
3. Every 48 hours, a Vercel Cron Job triggers the AI scan
4. Gemini AI classifies products into expiry tiers
5. The system auto-updates prices and logs the scan
6. Customers receive targeted promotional emails via Brevo

---

## 2. Goals & Success Metrics

### 2.1 Goals

- Reduce product expiry-related revenue loss by proactively discounting near-expiry stock
- Automate pricing decisions without requiring admin involvement post-upload
- Improve customer engagement through timely, relevant promotional emails
- Provide a scalable, serverless-native solution deployable in minutes

### 2.2 Success Metrics

| Metric | Target |
|---|---|
| Scan cycle accuracy | 100% products scanned every 48 hours |
| Discount application speed | < 5 minutes after scan completion |
| Email delivery rate | > 95% via Brevo |
| Zero missed expiry detections | All products within 30-day window flagged |
| False positive rate | < 1% (non-expiring products discounted) |
| Dashboard load time | < 2 seconds (P95) |
| CSV import throughput | 10,000 rows processed < 30 seconds |

---

## 3. Target Users

| User Type | Role |
|---|---|
| **Admin** | Uploads CSV, manages product listings, monitors dashboard |
| **Customer** | Receives discount emails, shops on the platform |
| **System (Automated)** | Gemini AI agent scanning products on a 48-hour cycle via Vercel Cron |

This system is designed to be **industry-agnostic** — applicable to any e-commerce platform selling products with expiry dates: grocery, pharmacy, cosmetics, F&B, supplements, etc.

---

## 4. Features & Requirements

### 4.1 Admin Authentication

**Description:** Secure admin login using Supabase Auth. No self-registration — admins are invited by a super-admin.

**Auth Flow:**
1. Super-admin invites admin via Supabase Dashboard (email invite)
2. Admin sets password and logs in at `/login`
3. All protected dashboard routes check session via `supabase.auth.getSession()`
4. JWT tokens are automatically refreshed by the Supabase client

**Acceptance Criteria:**
- Only authenticated users can access `/dashboard` routes
- Unauthenticated requests to API routes return `401 Unauthorized`
- Session persists across page refreshes via Supabase cookie-based auth
- Row-Level Security (RLS) on all tables enforces user-scoped data access

---

### 4.2 CSV Product Upload (Admin)

**Description:** Admin uploads a CSV file through the dashboard to list products in the system.

**Required CSV Columns:**

| Column | Type | Description |
|---|---|---|
| `product_name` | String | Name of the product |
| `SKU` | String | Unique Stock Keeping Unit identifier |
| `price` | Float | Current selling price |
| `MRP` | Float | Maximum Retail Price |
| `expiry_date` | Date (YYYY-MM-DD) | Product expiry date |
| `category` | String | Product category (e.g., Grocery, Pharma) |
| `image_url` | String (optional) | Public URL of product image for emails |

**Upload Flow:**
1. Admin selects CSV file via drag-and-drop on the dashboard
2. File is uploaded to **Supabase Storage** bucket `csv-uploads` for audit trail
3. Next.js API route (`/api/products/import`) reads and validates the file server-side
4. Valid rows are upserted into the `products` table using `ON CONFLICT (sku) DO UPDATE`
5. Invalid rows are collected and returned in an error report

**Acceptance Criteria:**
- System validates CSV structure on upload (required columns present, valid types)
- Invalid rows (missing columns, bad date format, negative prices) flagged with row number and reason
- Valid rows are upserted — existing SKUs update in place, new SKUs are inserted
- Admin receives a confirmation summary: X products added/updated, Y rows failed
- Uploaded CSV file stored in Supabase Storage for 90 days

---

### 4.3 Automated AI Scanning Engine (Every 48 Hours)

**Description:** A Vercel Cron Job triggers every 48 hours, calling the internal `/api/scan` endpoint. It passes all active product data to **Google Gemini API**, which evaluates each product's expiry date against the current date and classifies into tiers.

**Vercel Cron Configuration (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/scan",
      "schedule": "0 6 */2 * *"
    }
  ]
}
```

**Gemini AI Task:**
- Parse product records
- Compute days remaining until expiry for each product
- Classify products into tiers:

| Tier | Days Until Expiry | Action |
|---|---|---|
| **Tier 1 — Warning** | ≤ 30 days (> 15 days) | Apply 15% price discount |
| **Tier 2 — Critical** | ≤ 15 days | Apply additional 10% off Tier 1 price |
| **Expired** | ≤ 0 days | Flag for admin review; no discount |
| **No Action** | > 30 days | No change |

**Pricing Logic:**
```
Tier 1: discounted_price = original_price × 0.85
Tier 2: discounted_price = tier_1_price × 0.90  (i.e., original × 0.765)
```
Discounts stack sequentially. MRP is never modified. Configurable via `DISCOUNT_BASE` env var: `"current"` (default, stacking) or `"mrp"` (both tiers calculated from MRP independently).

**Acceptance Criteria:**
- Scan triggers automatically every 48 hours via Vercel Cron
- Scan endpoint protected by `CRON_SECRET` header to prevent unauthorized calls
- Gemini correctly identifies all products in each tier
- Prices updated in Supabase immediately after scan
- Each scan creates a `scan_logs` record with full summary
- Admin can view scan history in the dashboard
- Gemini API failures: retry up to 3 times with exponential backoff; if still failing, scan is aborted and admin notified via email

---

### 4.4 Automated Price Update

**Description:** Once the AI scan identifies a product in Tier 1 or Tier 2, the system automatically updates its `discounted_price` and `discount_tier` in the `products` table.

**Logic:**
```
Tier 1 (≤ 30 days, > 15 days):
  discounted_price = original_price * 0.85

Tier 2 (≤ 15 days):
  tier_1_price = original_price * 0.85
  discounted_price = tier_1_price * 0.90  // = original_price * 0.765
```

**Acceptance Criteria:**
- Price updates happen within 5 minutes of scan completion
- `MRP` is never modified — only `discounted_price`
- `original_price` column preserves the pre-discount price permanently
- Price update history appended to `price_history` JSONB array in the product row
- Products moving Tier 1 → Tier 2 get price re-updated
- Expired products: `is_expired = true`, `discount_tier = 'expired'`, no price change
- Products that return to > 30 days (e.g., expiry date correction): discount reversed

---

### 4.5 Customer Email Notifications (via Brevo)

**Description:** After each scan cycle, the system sends automated promotional emails to subscribed customers about available discounted products using the **Brevo Transactional Email API**.

**Email Triggers:**

| Trigger | Email Type |
|---|---|
| Product enters Tier 1 (≤ 30 days) | "Flash Deals" — 15% off |
| Product enters Tier 2 (≤ 15 days) | "Last Chance" — extra 10% off |
| Product already Tier 1, now Tier 2 | Updated discount email (if Tier 2 email not yet sent) |

**Email Content:**
- Product name and image (if `image_url` available)
- Original price vs. discounted price
- Offer percentage
- Expiry context ("Limited stock, grab it before it's gone!")
- CTA button linking to product page (`NEXT_PUBLIC_STORE_URL/products/{SKU}`)

**Deduplication:** The `email_logs` table tracks `(customer_email, product_sku, tier)` to ensure each customer receives at most 1 email per product per tier.

**Acceptance Criteria:**
- Emails sent only after price update confirmed in Supabase
- Each customer receives max 1 email per product per tier (no repeat spam)
- Brevo API handles delivery; system logs `status: "sent" | "failed"`
- Email templates stored as Brevo template IDs (`BREVO_TIER1_TEMPLATE_ID`, `BREVO_TIER2_TEMPLATE_ID`)
- Unsubscribed users excluded (checked against `customers.is_subscribed = true`)
- Failed emails logged; retried on the next scan cycle

---

### 4.6 Admin Dashboard

**Description:** A Next.js web dashboard for admins to manage products, view scan results, and monitor email performance. Hosted on Vercel.

**Dashboard Pages & Features:**

| Route | Feature | Description |
|---|---|---|
| `/dashboard` | Overview | KPI cards: total products, active discounts, last scan time, emails sent |
| `/dashboard/products` | Product Table | All products with status, current price, expiry date, tier badge |
| `/dashboard/products/upload` | CSV Upload | Drag-and-drop upload with real-time validation feedback |
| `/dashboard/scans` | Scan History | Log of all scans: timestamp, products scanned, flagged counts |
| `/dashboard/discounts` | Discount Tracker | Products currently on Tier 1 or Tier 2 |
| `/dashboard/emails` | Email Logs | Delivery status of all promotional emails |
| `/dashboard/products/[sku]` | Product Detail | Full history, price changes, manual override controls |
| `/login` | Auth | Supabase Auth login page |

**Manual Override:**
- Admin can manually set a custom price for any product (disables auto-discount for that product until re-enabled)
- Admin can mark a product as `excluded_from_scan = true`
- Admin can trigger an immediate scan (calls `/api/scan` manually)

---

## 5. Technical Architecture

### 5.1 System Architecture

```
[Admin Browser]
      |
      | HTTPS
      ↓
[Vercel — Next.js App]
  ├── /app (React Server Components + Client Components)
  ├── /api/products/import   ← CSV upload handler
  ├── /api/scan              ← Triggered by Vercel Cron (every 48h)
  ├── /api/products/[sku]    ← CRUD endpoints
  └── /api/emails/status     ← Email log queries
      |
      ├──── Supabase Client (supabase-js)
      |         ↓
      |    [Supabase Platform]
      |      ├── PostgreSQL (products, scan_logs, email_logs, customers)
      |      ├── Supabase Auth (admin sessions, JWT, RLS)
      |      └── Supabase Storage (csv-uploads bucket)
      |
      ├──── Google Gemini API (gemini-1.5-flash)
      |         ↓ Product classification → tier labels
      |
      └──── Brevo API (POST /v3/smtp/email)
                ↓ Promotional emails → Customer Inboxes


[Vercel Cron — every 48h]
      ↓
  POST /api/scan  (with CRON_SECRET header)
```

### 5.2 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) + Tailwind CSS | Hosted on Vercel |
| **Backend API** | Next.js Route Handlers (`/api/*`) | Serverless functions on Vercel |
| **Database** | Supabase (PostgreSQL 15) | Managed, with RLS |
| **Auth** | Supabase Auth | Cookie-based, SSR-compatible |
| **File Storage** | Supabase Storage | `csv-uploads` bucket |
| **AI / LLM** | Google Gemini API (`gemini-1.5-flash`) | Expiry tier classification |
| **Email** | Brevo Transactional Email API | Template-based promotional emails |
| **Scheduler** | Vercel Cron Jobs | Free on Vercel Hobby; Pro for custom schedules |
| **Hosting** | Vercel | Full-stack deployment, preview deployments per PR |
| **Supabase Client** | `@supabase/supabase-js` + `@supabase/ssr` | SSR-safe session handling |

### 5.3 Supabase Configuration

**Project Settings:**
- Region: `ap-south-1` (Mumbai) for India-first deployments, or nearest region
- Auth Providers: Email (magic link disabled; password only for admin accounts)
- Email Confirmations: Enabled
- RLS: Enabled on all tables

**Storage Buckets:**

| Bucket | Access | Purpose |
|---|---|---|
| `csv-uploads` | Private (admin only) | Stores uploaded product CSVs for audit |

### 5.4 Vercel Configuration

**`vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/scan",
      "schedule": "0 6 */2 * *"
    }
  ],
  "functions": {
    "app/api/scan/route.ts": {
      "maxDuration": 300
    },
    "app/api/products/import/route.ts": {
      "maxDuration": 60
    }
  }
}
```

- Scan function gets 300s (5 min) max duration for large product catalogs
- Import function gets 60s for CSV parsing

### 5.5 API Integrations

**Gemini API:**
- Model: `gemini-1.5-flash` (cost-efficient for batch classification)
- Input: JSON array of `{ product_name, SKU, expiry_date, current_price, days_until_expiry }`
- Output: JSON array of `{ SKU, tier: "tier_1" | "tier_2" | "none" | "expired" }`
- Batching: Send up to 500 products per Gemini call; paginate for larger catalogs
- Retry: Exponential backoff — 1s, 2s, 4s (max 3 retries)

**Brevo API:**
- Endpoint: `POST https://api.brevo.com/v3/smtp/email`
- Auth: `api-key` header with `BREVO_API_KEY`
- Template IDs stored in env vars: `BREVO_TIER1_TEMPLATE_ID`, `BREVO_TIER2_TEMPLATE_ID`
- Rate limit: 300 emails/minute (Brevo free tier); implement batching with 200ms delay

---

## 6. Database Schema (Supabase / PostgreSQL)

### 6.1 `products` Table

```sql
CREATE TABLE products (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name    TEXT NOT NULL,
  sku             TEXT NOT NULL UNIQUE,
  original_price  NUMERIC(10, 2) NOT NULL,
  mrp             NUMERIC(10, 2) NOT NULL,
  discounted_price NUMERIC(10, 2),
  expiry_date     DATE NOT NULL,
  category        TEXT NOT NULL,
  image_url       TEXT,
  discount_tier   TEXT CHECK (discount_tier IN ('none', 'tier_1', 'tier_2', 'expired')) DEFAULT 'none',
  is_expired      BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  excluded_from_scan BOOLEAN DEFAULT FALSE,
  manual_override_price NUMERIC(10, 2),
  price_history   JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for expiry scans
CREATE INDEX idx_products_expiry_date ON products (expiry_date) WHERE is_active = TRUE;
CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_tier ON products (discount_tier);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 6.2 `scan_logs` Table

```sql
CREATE TABLE scan_logs (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scanned_at            TIMESTAMPTZ DEFAULT NOW(),
  total_products        INTEGER NOT NULL DEFAULT 0,
  tier_1_flagged        INTEGER NOT NULL DEFAULT 0,
  tier_2_flagged        INTEGER NOT NULL DEFAULT 0,
  expired_flagged       INTEGER NOT NULL DEFAULT 0,
  no_action             INTEGER NOT NULL DEFAULT 0,
  emails_sent           INTEGER NOT NULL DEFAULT 0,
  status                TEXT CHECK (status IN ('success', 'partial', 'failed')) DEFAULT 'success',
  error_message         TEXT,
  triggered_by          TEXT CHECK (triggered_by IN ('cron', 'manual')) DEFAULT 'cron',
  duration_ms           INTEGER
);
```

### 6.3 `scan_product_results` Table

```sql
-- Detailed per-product results for each scan
CREATE TABLE scan_product_results (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id     UUID NOT NULL REFERENCES scan_logs(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku         TEXT NOT NULL,
  tier_before TEXT,
  tier_after  TEXT,
  price_before NUMERIC(10, 2),
  price_after  NUMERIC(10, 2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scan_results_scan_id ON scan_product_results (scan_id);
```

### 6.4 `email_logs` Table

```sql
CREATE TABLE email_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email  TEXT NOT NULL,
  product_sku     TEXT NOT NULL,
  product_id      UUID REFERENCES products(id),
  tier            TEXT NOT NULL CHECK (tier IN ('tier_1', 'tier_2')),
  scan_id         UUID REFERENCES scan_logs(id),
  brevo_message_id TEXT,
  status          TEXT CHECK (status IN ('sent', 'failed', 'skipped')) DEFAULT 'sent',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),

  -- Deduplication constraint: one email per customer per product per tier
  UNIQUE (customer_email, product_sku, tier)
);

CREATE INDEX idx_email_logs_sku ON email_logs (product_sku);
CREATE INDEX idx_email_logs_status ON email_logs (status);
```

### 6.5 `customers` Table

```sql
CREATE TABLE customers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  is_subscribed   BOOLEAN DEFAULT TRUE,
  subscribed_categories TEXT[] DEFAULT '{}',  -- empty = all categories
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_customers_subscribed ON customers (is_subscribed) WHERE is_subscribed = TRUE;
```

### 6.6 `csv_upload_logs` Table

```sql
CREATE TABLE csv_upload_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename          TEXT NOT NULL,
  storage_path      TEXT NOT NULL,  -- Supabase Storage path
  total_rows        INTEGER NOT NULL DEFAULT 0,
  rows_succeeded    INTEGER NOT NULL DEFAULT 0,
  rows_failed       INTEGER NOT NULL DEFAULT 0,
  error_details     JSONB DEFAULT '[]'::jsonb,  -- [{ row: 5, reason: "..." }]
  uploaded_by       UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.7 Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_product_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_upload_logs ENABLE ROW LEVEL SECURITY;

-- Admins (authenticated users) can read/write all data
-- Using service role key in API routes bypasses RLS for server-side operations

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert/update products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public cannot access any table (anon role denied)
-- All API routes use the service role key server-side
```

---

## 7. API Endpoints

All API routes are Next.js Route Handlers under `/app/api/`.

### 7.1 Product Endpoints

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/products/import` | Upload and parse CSV, upsert products | Admin JWT |
| `GET` | `/api/products` | List all products (paginated, filterable by tier/category) | Admin JWT |
| `GET` | `/api/products/[sku]` | Get single product by SKU | Admin JWT |
| `PATCH` | `/api/products/[sku]` | Manual price override, toggle exclusion | Admin JWT |
| `DELETE` | `/api/products/[sku]` | Soft-delete product (`is_active = false`) | Admin JWT |

### 7.2 Scan Endpoints

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/scan` | Trigger scan (cron + manual) | `CRON_SECRET` header |
| `GET` | `/api/scan` | List all scan logs | Admin JWT |
| `GET` | `/api/scan/[id]` | Get scan detail with per-product results | Admin JWT |

**Cron Protection:**
```typescript
// /api/scan/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  // Also accept admin JWT for manual triggers
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 7.3 Email Endpoints

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/emails` | List email logs (paginated) | Admin JWT |
| `GET` | `/api/emails/stats` | Email delivery stats summary | Admin JWT |

### 7.4 Customer Endpoints

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/customers` | Add subscriber | Admin JWT |
| `GET` | `/api/customers` | List all customers | Admin JWT |
| `PATCH` | `/api/customers/[id]` | Update subscription status | Admin JWT |
| `POST` | `/api/customers/unsubscribe` | Customer self-unsubscribe (public, via token) | Unsubscribe token |

### 7.5 Auth Endpoints

Auth is handled by Supabase Auth; no custom auth routes needed. The Next.js middleware handles session refresh:

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
export async function middleware(request: NextRequest) {
  // Refresh session; redirect unauthenticated users to /login
}
export const config = {
  matcher: ['/dashboard/:path*', '/api/products/:path*', '/api/scan/:path*', '/api/emails/:path*']
};
```

---

## 8. Data Flow

### 8.1 CSV Import Flow

```
Admin → Upload CSV → POST /api/products/import
  1. Upload raw file to Supabase Storage (csv-uploads/{timestamp}_{filename})
  2. Parse CSV rows with papaparse
  3. Validate each row:
     - required columns present
     - expiry_date is valid YYYY-MM-DD
     - price and MRP are positive numbers
     - MRP >= price
  4. Upsert valid rows to `products` table (conflict on `sku`)
  5. Insert CSV upload record to `csv_upload_logs`
  6. Return { added, updated, failed, errors: [{ row, reason }] }
```

### 8.2 Scan Flow

```
Vercel Cron → POST /api/scan (Bearer CRON_SECRET)
  1. Create scan_log record (status: 'in_progress')
  2. Fetch all active, non-excluded products from Supabase
  3. Compute days_until_expiry for each product
  4. Batch products (500/batch) → send to Gemini API
  5. Gemini returns tier classification per SKU
  6. For each classified product:
     a. Calculate new discounted_price if tier changed
     b. Update product row in Supabase (discounted_price, discount_tier, price_history)
     c. Insert scan_product_results row
  7. For tier_1 and tier_2 products, trigger email notifications
  8. Update scan_log record (status: 'success', summary counts, duration_ms)
```

### 8.3 Email Flow

```
Post-scan email dispatch:
  1. Collect all products newly entering Tier 1 or Tier 2
  2. Fetch all subscribed customers (is_subscribed = true)
  3. For each (customer, product, tier) pair:
     a. Check email_logs for existing record (deduplication)
     b. If no prior email: call Brevo API with template params
     c. Insert email_log record (status: 'sent' | 'failed')
  4. Failed emails logged for retry on next scan cycle
```

---

## 9. User Flows

### 9.1 Admin Flow

1. Admin navigates to `freshsaver.vercel.app/login`
2. Logs in with email + password (Supabase Auth)
3. Redirected to `/dashboard` — sees KPI overview
4. Navigates to `/dashboard/products/upload`
5. Drags and drops CSV file; receives validation summary
6. Every 48 hours: scan auto-runs via Vercel Cron
7. Admin checks `/dashboard/scans` for last scan results
8. Admin optionally overrides a price or excludes a product from scan at `/dashboard/products/[sku]`

### 9.2 Customer Flow

1. Customer email is registered in `customers` table (by admin or self-signup widget)
2. After scan, customer receives Brevo email: "New offers on products expiring soon!"
3. Customer clicks CTA → visits store product page with discounted price
4. Purchases at discounted price
5. Customer can unsubscribe via link in email → `POST /api/customers/unsubscribe?token=...`

---

## 10. Edge Cases & Handling

| Scenario | Handling |
|---|---|
| Product already expired on import | Marked `is_expired = true`, `discount_tier = 'expired'` immediately; admin alerted |
| Product moves Tier 1 → Tier 2 | Price re-updated to Tier 2 formula; new Tier 2 email sent if not already sent |
| Product expiry date corrected to > 30 days | Discount reversed (`discounted_price = original_price`, `tier = 'none'`) |
| Gemini API timeout / failure | Retry 3x with exponential backoff; scan marked `status: 'failed'`; admin email sent |
| Brevo email delivery failure | Logged `status: 'failed'`; retried on next scan cycle automatically |
| Duplicate CSV upload (same SKU) | Upserted — existing record updated, not duplicated |
| CSV with missing `expiry_date` | Row rejected; error logged with row number; admin notified in upload summary |
| No customers to email | Scan completes normally; email step logs 0 sent, no error |
| Vercel Cron cold start timeout | Scan set to 300s max duration; products batched so partial progress is possible |
| Manual scan triggered while cron running | Idempotency: check if a scan is `in_progress`; return 409 if so |
| Product with `excluded_from_scan = true` | Skipped by scan engine entirely |
| Admin manual price override | `manual_override_price` set; scan engine respects it and skips auto-discount |

---

## 11. Environment Variables

**Required in Vercel Project Settings:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...         # Public anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # Secret service role key (server-side only, NEVER expose to client)

# Google Gemini AI
GEMINI_API_KEY=AIza...

# Brevo Email
BREVO_API_KEY=xkeysib-...
BREVO_TIER1_TEMPLATE_ID=1                    # Brevo template ID for Tier 1 emails
BREVO_TIER2_TEMPLATE_ID=2                    # Brevo template ID for Tier 2 emails
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=FreshSaver Deals

# Vercel Cron Security
CRON_SECRET=your-random-secret-string        # Vercel auto-injects this for cron requests

# App Config
NEXT_PUBLIC_STORE_URL=https://yourstore.com  # For CTA links in emails
DISCOUNT_BASE=current                        # "current" (stacking) or "mrp"
```

---

## 12. Deployment Guide

### 12.1 Supabase Setup

1. Create new Supabase project at `supabase.com`
2. Run database migrations in Supabase SQL Editor (all DDL from Section 6)
3. Enable RLS on all tables
4. Create Storage bucket `csv-uploads` (private)
5. Copy `Project URL` and `anon/service_role` keys from Project Settings → API

### 12.2 Brevo Setup

1. Create account at `brevo.com`
2. Create two email templates: Tier 1 ("Flash Deals") and Tier 2 ("Last Chance")
3. Note template IDs for env vars
4. Generate API key from Settings → API Keys

### 12.3 Google Gemini Setup

1. Enable Gemini API in Google Cloud Console
2. Create API key (restrict to Gemini API only)
3. Add to env vars

### 12.4 Vercel Deployment

```bash
# Clone and install
git clone https://github.com/your-org/freshsaver
cd freshsaver
npm install

# Deploy to Vercel
npx vercel --prod

# Or connect GitHub repo in Vercel Dashboard for automatic deployments
```

1. Import GitHub repo in Vercel Dashboard
2. Add all environment variables in Vercel → Project → Settings → Environment Variables
3. Vercel automatically detects Next.js and configures build
4. Vercel Cron Jobs activate automatically from `vercel.json`
5. Preview deployments created for every PR

### 12.5 Post-Deployment Checklist

- [ ] Supabase: All tables created, RLS enabled
- [ ] Supabase: Storage bucket `csv-uploads` created as private
- [ ] Brevo: Email templates created and template IDs added to env
- [ ] Vercel: All env vars set in Production environment
- [ ] Vercel: Cron job visible in Vercel Dashboard → Cron Jobs
- [ ] Test: Admin login works
- [ ] Test: CSV upload succeeds and products appear in dashboard
- [ ] Test: Manual scan (`POST /api/scan` with CRON_SECRET) triggers correctly
- [ ] Test: Brevo test email delivered

---

## 13. Security Considerations

| Risk | Mitigation |
|---|---|
| Unauthorized scan trigger | `/api/scan` requires `CRON_SECRET` bearer token or valid admin JWT |
| Supabase key exposure | `SUPABASE_SERVICE_ROLE_KEY` used only in server-side Route Handlers, never in client code |
| CSV injection | CSV parsed with `papaparse`; values sanitized before DB insert; no formula evaluation |
| Email flooding | Deduplication via unique constraint on `(customer_email, product_sku, tier)` |
| IDOR on product routes | All API routes verify authenticated admin session; no per-user product scoping needed |
| Brevo API key leak | Stored in Vercel env vars; never sent to client |
| SQL injection | All DB operations via `supabase-js` parameterized queries |

---

## 14. Out of Scope (v1.0)

- Multi-language email support
- Inventory quantity tracking (only expiry-based logic)
- Customer segmentation for targeted emails (all subscribers receive same batch)
- Mobile app for admin
- Payment gateway integration
- Real-time price sync with third-party marketplaces (Amazon, Flipkart)
- Webhook support for external system price updates
- Multi-tenant / multi-store support

---

## 15. Open Questions

1. **Discount stacking vs MRP base:** Should `DISCOUNT_BASE` default to `"current"` (stacking) or `"mrp"`? Stacking feels more aggressive for Tier 2; MRP base is simpler to explain to customers.
2. **Post-Tier-2 unsold products:** Products completing Tier 2 without selling — archive automatically or require admin decision?
3. **Category-based email opt-in:** Should customers opt-in per category (e.g., only Grocery deals)? Deferred to v2 but schema supports `subscribed_categories[]`.
4. **Public deal page:** Should there be a public-facing `/deals` page showing all near-expiry discounted products? Simple read-only page, low effort, high visibility.
5. **Vercel Cron schedule:** Every 48 hours at 06:00 UTC (`0 6 */2 * *`) — confirm timezone alignment with the store's locale.

---

## 16. Appendix

### Sample CSV Format

```csv
product_name,SKU,price,MRP,expiry_date,category,image_url
Whey Protein 1kg,WP-1KG-001,1299,1599,2026-05-10,Supplements,https://cdn.example.com/wp1kg.jpg
Almond Milk 500ml,AM-500-002,89,110,2026-04-20,Grocery,
Vitamin C Tablets,VC-TAB-003,199,249,2026-04-18,Pharma,https://cdn.example.com/vitc.jpg
```

### Gemini Prompt Template

```
You are a product expiry analyzer for an e-commerce platform.

Given the following list of products with their expiry dates and today's date,
classify each product into one of these tiers:
- "tier_1": expiry is within 30 days but more than 15 days away
- "tier_2": expiry is within 15 days (and not yet expired)
- "expired": expiry date is today or in the past
- "none": expiry is more than 30 days away

Today's date: {{TODAY}}

Products:
{{PRODUCT_JSON}}

Respond ONLY in valid JSON array format. No explanation, no markdown.
[{ "SKU": "...", "tier": "tier_1" | "tier_2" | "none" | "expired" }]
```

### Price History JSONB Format

```json
[
  {
    "timestamp": "2026-04-04T06:00:00Z",
    "scan_id": "uuid",
    "tier_before": "none",
    "tier_after": "tier_1",
    "price_before": 1299.00,
    "price_after": 1104.15
  },
  {
    "timestamp": "2026-04-19T06:00:00Z",
    "scan_id": "uuid",
    "tier_before": "tier_1",
    "tier_after": "tier_2",
    "price_before": 1104.15,
    "price_after": 993.74
  }
]
```

### Key Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.4.0",
    "@google/generative-ai": "^0.15.0",
    "papaparse": "^5.4.1",
    "@types/papaparse": "^5.3.14",
    "tailwindcss": "^3.4.0",
    "date-fns": "^3.6.0"
  }
}
```
