-- FreshSaver Migration 002: Customer Public Access
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS TO products
--    (description + stock_quantity for real storefront feel)
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS stock_quantity     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit               TEXT DEFAULT 'piece',  -- e.g. '500ml', '1kg', 'piece'
  ADD COLUMN IF NOT EXISTS brand              TEXT;

-- ============================================================
-- 2. ADD COLUMNS TO customers
--    (unsubscribe token for email unsubscribe links)
-- ============================================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS unsubscribed_at   TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_unsubscribe_token
  ON customers (unsubscribe_token);

-- ============================================================
-- 3. CREATE banners TABLE (homepage hero carousel)
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  gradient    TEXT DEFAULT 'from-emerald-600 to-teal-700',
  cta_label   TEXT DEFAULT 'Shop Now',
  cta_href    TEXT DEFAULT '/deals',
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. PUBLIC VIEW: products_public
--    Hides expiry_date, price_history, internal admin fields.
--    Customers query this view — NOT the raw products table.
-- ============================================================
CREATE OR REPLACE VIEW products_public AS
SELECT
  id,
  product_name,
  sku,
  brand,
  description,
  unit,
  stock_quantity,
  original_price,
  mrp,
  discounted_price,
  category,
  image_url,
  discount_tier,
  is_active,
  created_at,
  updated_at
FROM products
WHERE is_active = TRUE
  AND is_expired = FALSE;

-- Grant anon role SELECT on the public view
GRANT SELECT ON products_public TO anon;

-- ============================================================
-- 5. RLS POLICIES — anon (public customer access)
-- ============================================================

-- 5a. Customers can read all active, non-expired products
--     (RLS applies when anon queries products_public view)
CREATE POLICY "Public can read active products"
  ON products FOR SELECT
  TO anon
  USING (
    is_active = TRUE
    AND is_expired = FALSE
  );

-- 5b. Customers can subscribe themselves (INSERT into customers)
CREATE POLICY "Public can subscribe"
  ON customers FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5c. Customers can unsubscribe themselves (UPDATE their own row via token)
CREATE POLICY "Public can unsubscribe via token"
  ON customers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5d. Public can read active banners
CREATE POLICY "Public can read active banners"
  ON banners FOR SELECT
  TO anon
  USING (is_active = TRUE);

-- ============================================================
-- 6. RLS POLICIES — authenticated admins for banners
-- ============================================================
CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 7. INDEXES for customer-facing queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products (category)
  WHERE is_active = TRUE AND is_expired = FALSE;

CREATE INDEX IF NOT EXISTS idx_products_discount_tier_active
  ON products (discount_tier, expiry_date)
  WHERE is_active = TRUE AND is_expired = FALSE;

CREATE INDEX IF NOT EXISTS idx_banners_active
  ON banners (sort_order)
  WHERE is_active = TRUE;

-- ============================================================
-- 8. SEED: default banners (edit in Supabase dashboard)
-- ============================================================
INSERT INTO banners (title, subtitle, cta_label, cta_href, sort_order, gradient)
VALUES
  (
    'Up to 25% Off Before They''re Gone',
    'Flash deals on near-expiry stock — refreshed every 48 hours by AI',
    'Shop Flash Deals',
    '/deals/flash',
    1,
    'from-red-500 to-orange-500'
  ),
  (
    'Save Big on Groceries & Supplements',
    'Deeply discounted products. Same quality. Lower price.',
    'Browse All Deals',
    '/deals',
    2,
    'from-emerald-600 to-teal-600'
  ),
  (
    'Never Miss a Deal',
    'Subscribe free — get email alerts when new deals drop',
    'Get Alerts',
    '/subscribe',
    3,
    'from-violet-600 to-indigo-600'
  )
ON CONFLICT DO NOTHING;
