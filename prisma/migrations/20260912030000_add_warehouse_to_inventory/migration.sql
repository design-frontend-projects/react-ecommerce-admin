-- AlterTable: inventory
-- 1. Add warehouse_id and warehouse_location_id
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "warehouse_id" UUID;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "warehouse_location_id" UUID;

-- 2. Drop quantity column from inventory as quantity is managed via stock_balances
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "quantity";

-- 3. Foreign Keys for inventory
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_warehouse_id_fkey'
    ) THEN
        ALTER TABLE "inventory"
            ADD CONSTRAINT "inventory_warehouse_id_fkey"
            FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_warehouse_location_id_fkey'
    ) THEN
        ALTER TABLE "inventory"
            ADD CONSTRAINT "inventory_warehouse_location_id_fkey"
            FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_store_id_fkey'
    ) THEN
        ALTER TABLE "inventory"
            ADD CONSTRAINT "inventory_store_id_fkey"
            FOREIGN KEY ("store_id") REFERENCES "stores"("store_id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- 4. Indexes for inventory queries
CREATE INDEX IF NOT EXISTS "idx_inventory_warehouse_id" ON "inventory"("warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_warehouse_location_id" ON "inventory"("warehouse_location_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_store_id" ON "inventory"("store_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_tenant_id" ON "inventory"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_product_id" ON "inventory"("product_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_product_variant_id" ON "inventory"("product_variant_id");
