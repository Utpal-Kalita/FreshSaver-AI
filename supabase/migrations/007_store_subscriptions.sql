-- Store-specific shopper opt-ins for owner customer lists and targeted deal alerts.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

CREATE TABLE IF NOT EXISTS store_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'store_qr')),
  interested_categories TEXT[] NOT NULL DEFAULT '{}',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_store_subscriptions_store
  ON store_subscriptions (store_id, notifications_enabled);

CREATE INDEX IF NOT EXISTS idx_store_subscriptions_customer
  ON store_subscriptions (customer_id);

DROP TRIGGER IF EXISTS store_subscriptions_updated_at ON store_subscriptions;
CREATE TRIGGER store_subscriptions_updated_at
  BEFORE UPDATE ON store_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE store_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own store subscriptions"
  ON store_subscriptions FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Customers can create own store subscriptions"
  ON store_subscriptions FOR INSERT TO authenticated
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Customers can update own store subscriptions"
  ON store_subscriptions FOR UPDATE TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Store admins can read own subscribers"
  ON store_subscriptions FOR SELECT TO authenticated
  USING (store_id IN (SELECT store_id FROM store_admins WHERE user_id = auth.uid()));

-- Preserve known store relationships from previously sent store-scoped deal emails.
INSERT INTO store_subscriptions (store_id, customer_id, source, interested_categories)
SELECT DISTINCT
  email_logs.store_id,
  customers.id,
  'website',
  COALESCE(customers.subscribed_categories, '{}')
FROM email_logs
JOIN customers ON LOWER(customers.email) = LOWER(email_logs.customer_email)
WHERE email_logs.store_id IS NOT NULL
  AND customers.is_subscribed = TRUE
ON CONFLICT (store_id, customer_id) DO NOTHING;
