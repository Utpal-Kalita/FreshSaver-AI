-- Demand-aware markdown evidence, store-scoped audit logs, and missing atomic helpers.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS recommended_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS recommended_discount_pct NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS recommendation_reason JSONB,
  ADD COLUMN IF NOT EXISTS recommendation_confidence NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS recommendation_version TEXT,
  ADD COLUMN IF NOT EXISTS recommended_at TIMESTAMPTZ;

ALTER TABLE scan_logs
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE scan_product_results
  ADD COLUMN IF NOT EXISTS recommended_discount_pct NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS recommendation_reason JSONB,
  ADD COLUMN IF NOT EXISTS recommendation_confidence NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS recommendation_version TEXT;

ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE csv_upload_logs
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scan_logs_store_id ON scan_logs (store_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_store_id ON email_logs (store_id);
CREATE INDEX IF NOT EXISTS idx_csv_upload_logs_store_id ON csv_upload_logs (store_id);

ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_customer_email_product_sku_tier_key;
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_customer_product_tier_unique
  ON email_logs (customer_email, product_id, tier);

CREATE OR REPLACE FUNCTION append_price_history(p_product_id UUID, p_entry JSONB)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE products
  SET price_history = COALESCE(price_history, '[]'::JSONB) || jsonb_build_array(p_entry)
  WHERE id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_qty <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE products
  SET stock_quantity = stock_quantity - p_qty
  WHERE id = p_product_id
    AND stock_quantity >= p_qty
    AND is_active = TRUE
    AND is_expired = FALSE;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION append_price_history(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrement_stock(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION append_price_history(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_stock(UUID, INTEGER) TO service_role;

DROP POLICY IF EXISTS "Admins can manage stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage store_admins" ON store_admins;
DROP POLICY IF EXISTS "Admins can read products" ON products;
DROP POLICY IF EXISTS "Admins can write products" ON products;
DROP POLICY IF EXISTS "Admins can read scan_logs" ON scan_logs;
DROP POLICY IF EXISTS "Admins can write scan_logs" ON scan_logs;
DROP POLICY IF EXISTS "Admins can read scan_product_results" ON scan_product_results;
DROP POLICY IF EXISTS "Admins can write scan_product_results" ON scan_product_results;
DROP POLICY IF EXISTS "Admins can read email_logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can write email_logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can read customers" ON customers;
DROP POLICY IF EXISTS "Admins can write customers" ON customers;
DROP POLICY IF EXISTS "Admins can read csv_upload_logs" ON csv_upload_logs;
DROP POLICY IF EXISTS "Admins can write csv_upload_logs" ON csv_upload_logs;

CREATE POLICY "Authenticated users can read active stores"
  ON stores FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Users can read own store assignments"
  ON store_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Store admins can read own scan logs"
  ON scan_logs FOR SELECT TO authenticated
  USING (store_id IN (SELECT store_id FROM store_admins WHERE user_id = auth.uid()));

CREATE POLICY "Store admins can read own scan results"
  ON scan_product_results FOR SELECT TO authenticated
  USING (scan_id IN (
    SELECT id FROM scan_logs
    WHERE store_id IN (SELECT store_id FROM store_admins WHERE user_id = auth.uid())
  ));

CREATE POLICY "Store admins can read own email logs"
  ON email_logs FOR SELECT TO authenticated
  USING (store_id IN (SELECT store_id FROM store_admins WHERE user_id = auth.uid()));

CREATE POLICY "Customers can read own customer record"
  ON customers FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Customers can update own preferences"
  ON customers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Store admins can read own upload logs"
  ON csv_upload_logs FOR SELECT TO authenticated
  USING (store_id IN (SELECT store_id FROM store_admins WHERE user_id = auth.uid()));
