-- Migration: 20260913020000_enhance_inventory_model
-- Description: Add missing enterprise fields to inventory table (safety_stock, reorder_quantity, reorder_level, unit_cost, lead_time_days, is_active, status, coordinates, last_restocked_date, notes)

DO $$
BEGIN
    -- 1. Add safety_stock
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'safety_stock'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "safety_stock" INTEGER DEFAULT 0;
    END IF;

    -- 2. Add reorder_quantity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'reorder_quantity'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "reorder_quantity" INTEGER DEFAULT 0;
    END IF;

    -- 3. Add reorder_level (compatibility alias)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'reorder_level'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "reorder_level" INTEGER DEFAULT 0;
    END IF;

    -- 4. Add unit_cost
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'unit_cost'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "unit_cost" DECIMAL(18, 4);
    END IF;

    -- 5. Add lead_time_days
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'lead_time_days'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "lead_time_days" INTEGER DEFAULT 1;
    END IF;

    -- 6. Add is_active
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "is_active" BOOLEAN DEFAULT true;
    END IF;

    -- 7. Add status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'status'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "status" VARCHAR(50) DEFAULT 'active';
    END IF;

    -- 8. Add aisle, rack, shelf, bin coordinates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'aisle'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "aisle" VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'rack'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "rack" VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'shelf'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "shelf" VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'bin'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "bin" VARCHAR(50);
    END IF;

    -- 9. Add last_restocked_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'last_restocked_date'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "last_restocked_date" TIMESTAMPTZ(6);
    END IF;

    -- 10. Add notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'notes'
    ) THEN
        ALTER TABLE "public"."inventory" ADD COLUMN "notes" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_inventory_tenant_store_wh" ON "public"."inventory"("tenant_id", "store_id", "warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_tenant_prod_var" ON "public"."inventory"("tenant_id", "product_id", "product_variant_id");
