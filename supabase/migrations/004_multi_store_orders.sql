-- ============================================================
-- Migration 004: Multi-Store + Orders
-- ============================================================

-- ============================================================
-- SECTION 1: stores table
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  address    TEXT,
  city       TEXT,
  lat        NUMERIC(10, 7),
  lng        NUMERIC(10, 7),
  image_url  TEXT,
  phone      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores (slug);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores (is_active) WHERE is_active = TRUE;

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active stores"
  ON stores FOR SELECT TO anon
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage stores"
  ON stores FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- SECTION 2: store_admins table
-- ============================================================
CREATE TABLE IF NOT EXISTS store_admins (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

ALTER TABLE store_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store_admins"
  ON store_admins FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- SECTION 3: Add store_id to products (nullable for BC)
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products (store_id);

-- ============================================================
-- SECTION 4: Add user_id to customers (nullable for BC)
-- ============================================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id
  ON customers (user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- SECTION 5: orders table
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_email TEXT NOT NULL,
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  status         TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'cancelled', 'completed')),
  total_amount   NUMERIC(10, 2) NOT NULL,
  payment_ref    UUID DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id    ON orders (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders (status);

-- Reuse the existing update_updated_at() function from migration 001
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own orders"
  ON orders FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Store admins can read their orders"
  ON orders FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Store admins can update their orders"
  ON orders FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_admins WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_admins WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- SECTION 6: order_items table
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  sku          TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10, 2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own order items"
  ON order_items FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create order items"
  ON order_items FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "Store admins can read their order items"
  ON order_items FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE store_id IN (
        SELECT store_id FROM store_admins WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- SECTION 7: Update products_public view to include store info
-- ============================================================
DROP VIEW IF EXISTS products_public;

CREATE OR REPLACE VIEW products_public AS
SELECT
  p.id,
  p.product_name,
  p.sku,
  p.brand,
  p.description,
  p.unit,
  p.stock_quantity,
  p.original_price,
  p.mrp,
  p.discounted_price,
  p.category,
  p.image_url,
  p.discount_tier,
  p.is_active,
  p.store_id,
  p.created_at,
  p.updated_at,
  s.name    AS store_name,
  s.slug    AS store_slug,
  s.city    AS store_city,
  s.address AS store_address
FROM products p
LEFT JOIN stores s ON p.store_id = s.id
WHERE p.is_active = TRUE
  AND p.is_expired = FALSE;

GRANT SELECT ON products_public TO anon;

-- ============================================================
-- SECTION 8: Store-admin RLS policy for products
-- ============================================================
CREATE POLICY "Store admins can manage their products"
  ON products FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM store_admins WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_admins WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- SECTION 9: Helper RPC for store admin role check
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_store_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT store_id FROM store_admins WHERE user_id = p_user_id LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- SECTION 10: Seed one default store (maps to existing products)
-- ============================================================
INSERT INTO stores (name, slug, address, city, lat, lng, is_active)
VALUES ('FreshSaver Main Store', 'main', '123 Market Street', 'Bangalore', 12.9716, 77.5946, true)
ON CONFLICT (slug) DO NOTHING;
