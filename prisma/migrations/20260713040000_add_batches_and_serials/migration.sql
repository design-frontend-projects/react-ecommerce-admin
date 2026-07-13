BEGIN;



-- =============================================================================
-- Batch/lot + serial-number tracking. Enforcement happens in the movement
-- engine (20260713100000): batch-tracked variants must carry a batch on every
-- physical movement; serial-tracked variants must enumerate serials matching
-- the quantity. Expiry is per-batch (products.has_expiration stays as the
-- coarse legacy flag).
-- =============================================================================

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'batch_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "batch_status_enum" AS ENUM ('active', 'depleted', 'expired', 'blocked');
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'serial_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "serial_status_enum" AS ENUM ('in_stock', 'reserved', 'sold', 'returned', 'damaged', 'in_transit', 'written_off');
  END IF;
END $do$;



CREATE TABLE IF NOT EXISTS "product_batches" (
  "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               UUID NOT NULL,
  "product_variant_id"      UUID NOT NULL,
  "batch_number"            VARCHAR(60) NOT NULL,
  "supplier_id"             INTEGER,
  "manufacture_date"        DATE,
  "expiry_date"             DATE,
  "unit_cost"               DECIMAL(18,4) NOT NULL DEFAULT 0,
  "status"                  "batch_status_enum" NOT NULL DEFAULT 'active',
  "received_reference_type" VARCHAR(40),
  "received_reference_id"   UUID,
  "notes"                   TEXT,
  "created_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"            UUID DEFAULT auth.uid(),
  CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_batches_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "product_batches_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_batches_tenant_variant_number"
  ON "product_batches" ("tenant_id", "product_variant_id", "batch_number");

CREATE INDEX IF NOT EXISTS "idx_product_batches_tenant_id" ON "product_batches" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_product_batches_variant_id" ON "product_batches" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_product_batches_expiry_date" ON "product_batches" ("expiry_date");

CREATE INDEX IF NOT EXISTS "idx_product_batches_status" ON "product_batches" ("status");



CREATE TABLE IF NOT EXISTS "product_serials" (
  "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               UUID NOT NULL,
  "product_variant_id"      UUID NOT NULL,
  "batch_id"                UUID,
  "serial_number"           VARCHAR(80) NOT NULL,
  "status"                  "serial_status_enum" NOT NULL DEFAULT 'in_stock',
  "store_id"                UUID,
  "warehouse_location_id"   UUID,
  "unit_cost"               DECIMAL(18,4) NOT NULL DEFAULT 0,
  "received_at"             TIMESTAMPTZ(6),
  "sold_at"                 TIMESTAMPTZ(6),
  "received_reference_type" VARCHAR(40),
  "received_reference_id"   UUID,
  "last_reference_type"     VARCHAR(40),
  "last_reference_id"       UUID,
  "warranty_until"          DATE,
  "notes"                   TEXT,
  "created_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"            UUID DEFAULT auth.uid(),
  CONSTRAINT "product_serials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_serials_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "product_serials_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "product_serials_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "product_serials_warehouse_location_id_fkey"
    FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_serials_tenant_variant_number"
  ON "product_serials" ("tenant_id", "product_variant_id", "serial_number");

CREATE INDEX IF NOT EXISTS "idx_product_serials_tenant_id" ON "product_serials" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_product_serials_variant_id" ON "product_serials" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_product_serials_status" ON "product_serials" ("status");

CREATE INDEX IF NOT EXISTS "idx_product_serials_store_id" ON "product_serials" ("store_id");

CREATE INDEX IF NOT EXISTS "idx_product_serials_batch_id" ON "product_serials" ("batch_id");



-- N serials per movement (engine writes the links)
CREATE TABLE IF NOT EXISTS "inventory_movement_serials" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "movement_id" UUID NOT NULL,
  "serial_id"   UUID NOT NULL,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_movement_serials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_movement_serials_movement_id_fkey"
    FOREIGN KEY ("movement_id") REFERENCES "inventory_movements" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "inventory_movement_serials_serial_id_fkey"
    FOREIGN KEY ("serial_id") REFERENCES "product_serials" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_inventory_movement_serials_pair"
  ON "inventory_movement_serials" ("movement_id", "serial_id");

CREATE INDEX IF NOT EXISTS "idx_inventory_movement_serials_serial" ON "inventory_movement_serials" ("serial_id");



-- Wire the deferred batch FK on stock_by_location
ALTER TABLE "stock_by_location" DROP CONSTRAINT IF EXISTS "stock_by_location_batch_id_fkey";
ALTER TABLE "stock_by_location"
  ADD CONSTRAINT "stock_by_location_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;



-- Optional batch reference on document lines (all additive, nullable)
ALTER TABLE "stock_adjustment_items" ADD COLUMN IF NOT EXISTS "batch_id" UUID;

ALTER TABLE "stock_adjustment_items" DROP CONSTRAINT IF EXISTS "stock_adjustment_items_batch_id_fkey";
ALTER TABLE "stock_adjustment_items"
  ADD CONSTRAINT "stock_adjustment_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;



ALTER TABLE "stock_transfer_items" ADD COLUMN IF NOT EXISTS "batch_id" UUID;

ALTER TABLE "stock_transfer_items" DROP CONSTRAINT IF EXISTS "stock_transfer_items_batch_id_fkey";
ALTER TABLE "stock_transfer_items"
  ADD CONSTRAINT "stock_transfer_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;



ALTER TABLE "sales_invoice_items" ADD COLUMN IF NOT EXISTS "batch_id" UUID;

ALTER TABLE "sales_invoice_items" DROP CONSTRAINT IF EXISTS "sales_invoice_items_batch_id_fkey";
ALTER TABLE "sales_invoice_items"
  ADD CONSTRAINT "sales_invoice_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;



ALTER TABLE "sales_return_items" ADD COLUMN IF NOT EXISTS "batch_id" UUID;

ALTER TABLE "sales_return_items" DROP CONSTRAINT IF EXISTS "sales_return_items_batch_id_fkey";
ALTER TABLE "sales_return_items"
  ADD CONSTRAINT "sales_return_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;



ALTER TABLE "purchase_return_items" ADD COLUMN IF NOT EXISTS "batch_id" UUID;

ALTER TABLE "purchase_return_items" DROP CONSTRAINT IF EXISTS "purchase_return_items_batch_id_fkey";
ALTER TABLE "purchase_return_items"
  ADD CONSTRAINT "purchase_return_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;



CREATE OR REPLACE TRIGGER "trg_product_batches_updated_at"
BEFORE UPDATE ON "product_batches" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_product_serials_updated_at"
BEFORE UPDATE ON "product_serials" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



ALTER TABLE "product_batches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "product_serials" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "inventory_movement_serials" ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "product_batches_all_own" ON "product_batches";
CREATE POLICY "product_batches_all_own" ON "product_batches"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "product_serials_all_own" ON "product_serials";
CREATE POLICY "product_serials_all_own" ON "product_serials"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "inventory_movement_serials_all_own" ON "inventory_movement_serials";
CREATE POLICY "inventory_movement_serials_all_own" ON "inventory_movement_serials"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "product_serials" s
    WHERE s."id" = "inventory_movement_serials"."serial_id"
      AND s."auth_user_id" = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "product_serials" s
    WHERE s."id" = "inventory_movement_serials"."serial_id"
      AND s."auth_user_id" = auth.uid()));



COMMIT;
