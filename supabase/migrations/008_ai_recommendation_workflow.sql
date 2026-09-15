-- Hybrid ML recommendations, unit economics, human approval, and observed outcomes.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS minimum_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS disposal_cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES scan_logs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded', 'expired')),
  tier TEXT NOT NULL CHECK (tier IN ('tier_1', 'tier_2')),
  regular_price NUMERIC(10, 2) NOT NULL,
  recommended_price NUMERIC(10, 2) NOT NULL,
  recommended_discount_pct NUMERIC(5, 2) NOT NULL,
  model_provider TEXT NOT NULL,
  model_version TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  campaign_copy JSONB NOT NULL DEFAULT '{}'::jsonb,
  valid_until DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recommendations_store_status
  ON recommendations (store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_product
  ON recommendations (product_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_one_pending_per_product
  ON recommendations (product_id) WHERE status = 'pending';

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store admins can read own recommendations"
  ON recommendations FOR SELECT TO authenticated
  USING (store_id IN (SELECT store_id FROM store_admins WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS inventory_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('snapshot', 'recommendation_approved', 'sale', 'pickup', 'waste', 'donation', 'adjustment')),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(10, 2),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'freshsaver',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_events_store_product
  ON inventory_events (store_id, product_id, occurred_at DESC);

ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store admins can read own inventory events"
  ON inventory_events FOR SELECT TO authenticated
  USING (store_id IN (SELECT store_id FROM store_admins WHERE user_id = auth.uid()));
