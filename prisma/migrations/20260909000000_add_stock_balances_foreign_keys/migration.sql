-- Migration: 20260909000000_add_stock_balances_foreign_keys
-- Description: Add foreign key constraints and indexes to stock_balances for product_variants, warehouses, stores, and warehouse_locations

DO $$
BEGIN
    -- 1. Foreign key from stock_balances to product_variants
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_balances_product_variant_id_fkey'
    ) THEN
        ALTER TABLE "public"."stock_balances"
        ADD CONSTRAINT "stock_balances_product_variant_id_fkey"
        FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- 2. Foreign key from stock_balances to warehouses
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_balances_warehouse_id_fkey'
    ) THEN
        ALTER TABLE "public"."stock_balances"
        ADD CONSTRAINT "stock_balances_warehouse_id_fkey"
        FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    -- 3. Foreign key from stock_balances to stores
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_balances_store_id_fkey'
    ) THEN
        ALTER TABLE "public"."stock_balances"
        ADD CONSTRAINT "stock_balances_store_id_fkey"
        FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- 4. Foreign key from stock_balances to warehouse_locations
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_balances_location_id_fkey'
    ) THEN
        ALTER TABLE "public"."stock_balances"
        ADD CONSTRAINT "stock_balances_location_id_fkey"
        FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- Indexes for performance and lookups
CREATE INDEX IF NOT EXISTS "idx_stock_balances_product_variant_id" ON "public"."stock_balances"("product_variant_id");
CREATE INDEX IF NOT EXISTS "idx_stock_balances_warehouse_id" ON "public"."stock_balances"("warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_stock_balances_store_id" ON "public"."stock_balances"("store_id");
CREATE INDEX IF NOT EXISTS "idx_stock_balances_location_id" ON "public"."stock_balances"("location_id");
CREATE INDEX IF NOT EXISTS "idx_stock_balances_tenant_variant" ON "public"."stock_balances"("tenant_id", "product_variant_id");
CREATE INDEX IF NOT EXISTS "idx_stock_balances_tenant_store" ON "public"."stock_balances"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "idx_stock_balances_tenant_warehouse" ON "public"."stock_balances"("tenant_id", "warehouse_id");
