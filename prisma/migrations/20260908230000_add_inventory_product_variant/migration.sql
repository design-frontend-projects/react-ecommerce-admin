-- Migration: 20260908230000_add_inventory_product_variant
-- Description: Add product_variant_id to inventory table with foreign key and indexes

DO $$
BEGIN
    -- 1. Add product_variant_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'inventory' 
          AND column_name = 'product_variant_id'
    ) THEN
        ALTER TABLE "public"."inventory" 
        ADD COLUMN "product_variant_id" UUID;
    END IF;

    -- 2. Add foreign key constraint to product_variants
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_variant_id_fkey'
    ) THEN
        ALTER TABLE "public"."inventory"
        ADD CONSTRAINT "inventory_product_variant_id_fkey"
        FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- 3. Create indexes for performance and multi-tenant lookup
CREATE INDEX IF NOT EXISTS "idx_inventory_product_variant_id" ON "public"."inventory"("product_variant_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_tenant_product_variant" ON "public"."inventory"("tenant_id", "product_id", "product_variant_id");
