-- FreshSaver Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name          TEXT NOT NULL,
  sku                   TEXT NOT NULL UNIQUE,
  original_price        NUMERIC(10, 2) NOT NULL,
  mrp                   NUMERIC(10, 2) NOT NULL,
  discounted_price      NUMERIC(10, 2),
  expiry_date           DATE NOT NULL,
  category              TEXT NOT NULL,
  image_url             TEXT,
  discount_tier         TEXT DEFAULT 'none' CHECK (discount_tier IN ('none', 'tier_1', 'tier_2', 'expired')),
  is_expired            BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  excluded_from_scan    BOOLEAN DEFAULT FALSE,
  manual_override_price NUMERIC(10, 2),
  price_history         JSONB DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products (expiry_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_tier ON products (discount_tier);

-- Auto-update updated_at trigger
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

-- ============================================================
-- 2. SCAN LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scanned_at        TIMESTAMPTZ DEFAULT NOW(),
  total_products    INTEGER NOT NULL DEFAULT 0,
  tier_1_flagged    INTEGER NOT NULL DEFAULT 0,
  tier_2_flagged    INTEGER NOT NULL DEFAULT 0,
  expired_flagged   INTEGER NOT NULL DEFAULT 0,
  no_action         INTEGER NOT NULL DEFAULT 0,
  emails_sent       INTEGER NOT NULL DEFAULT 0,
  status            TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'success', 'partial', 'failed')),
  error_message     TEXT,
  triggered_by      TEXT DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual')),
  duration_ms       INTEGER
);

-- ============================================================
-- 3. SCAN PRODUCT RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_product_results (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id      UUID NOT NULL REFERENCES scan_logs(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku          TEXT NOT NULL,
  tier_before  TEXT,
  tier_after   TEXT,
  price_before NUMERIC(10, 2),
  price_after  NUMERIC(10, 2),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_product_results (scan_id);

-- ============================================================
-- 4. EMAIL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email    TEXT NOT NULL,
  product_sku       TEXT NOT NULL,
  product_id        UUID REFERENCES products(id),
  tier              TEXT NOT NULL CHECK (tier IN ('tier_1', 'tier_2')),
  scan_id           UUID REFERENCES scan_logs(id),
  brevo_message_id  TEXT,
  status            TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message     TEXT,
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_email, product_sku, tier)
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sku ON email_logs (product_sku);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs (status);

-- ============================================================
-- 5. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email                 TEXT NOT NULL UNIQUE,
  name                  TEXT,
  is_subscribed         BOOLEAN DEFAULT TRUE,
  subscribed_categories TEXT[] DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_subscribed ON customers (is_subscribed) WHERE is_subscribed = TRUE;

-- ============================================================
-- 6. CSV UPLOAD LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS csv_upload_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename       TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  total_rows     INTEGER NOT NULL DEFAULT 0,
  rows_succeeded INTEGER NOT NULL DEFAULT 0,
  rows_failed    INTEGER NOT NULL DEFAULT 0,
  error_details  JSONB DEFAULT '[]'::jsonb,
  uploaded_by    UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_product_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_upload_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated admin users can do everything
-- (API routes use service_role key which bypasses RLS)
CREATE POLICY "Admins can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read scan_logs" ON scan_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write scan_logs" ON scan_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read scan_product_results" ON scan_product_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write scan_product_results" ON scan_product_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read email_logs" ON email_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write email_logs" ON email_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read csv_upload_logs" ON csv_upload_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can write csv_upload_logs" ON csv_upload_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
