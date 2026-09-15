-- ============================================================
-- Migration 005: Per-store SKU uniqueness
-- ============================================================
-- Previously products had a global UNIQUE constraint on sku.
-- This allowed a malicious store to overwrite another store's product
-- by uploading a CSV with the same SKU.
-- Fix: make the unique constraint (store_id, sku) instead.
-- ============================================================

-- Drop the global unique index/constraint on sku
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
DROP INDEX IF EXISTS products_sku_key;

-- Add per-store uniqueness: (store_id, sku)
ALTER TABLE products
  ADD CONSTRAINT products_store_sku_unique UNIQUE (store_id, sku);

-- Update the existing index used for lookups
DROP INDEX IF EXISTS idx_products_store_sku;
CREATE INDEX IF NOT EXISTS idx_products_store_sku ON products (store_id, sku);
