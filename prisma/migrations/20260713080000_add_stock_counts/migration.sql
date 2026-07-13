BEGIN;



-- =============================================================================
-- Stock counts (full counts + cycle counts).
-- Lifecycle: draft -> counting (snapshot frozen) -> review -> posted/cancelled.
-- Posting computes variances and creates+applies a stock_adjustments document
-- (type 'stocktake') so the proven adjustment pipeline owns the stock effect;
-- the count links to it via posted_adjustment_id.
-- =============================================================================

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'stock_count_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "stock_count_status_enum" AS ENUM ('draft', 'counting', 'review', 'posted', 'cancelled');
  END IF;
END $do$;



CREATE SEQUENCE IF NOT EXISTS "stock_counts_seq";



CREATE TABLE IF NOT EXISTS "stock_counts" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID NOT NULL,
  "count_number"          VARCHAR(30) NOT NULL DEFAULT ('SC-' || lpad(nextval('stock_counts_seq')::text, 6, '0')),
  "store_id"              UUID NOT NULL,
  "warehouse_id"          UUID,
  "warehouse_location_id" UUID,
  "category_id"           INTEGER,
  "status"                "stock_count_status_enum" NOT NULL DEFAULT 'draft',
  "is_blind"              BOOLEAN NOT NULL DEFAULT false,
  "snapshot_at"           TIMESTAMPTZ(6),
  "counted_by"            TEXT,
  "reviewed_by"           TEXT,
  "posted_by"             TEXT,
  "posted_at"             TIMESTAMPTZ(6),
  "posted_adjustment_id"  UUID,
  "notes"                 TEXT,
  "created_by"            TEXT,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"          UUID DEFAULT auth.uid(),
  CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_counts_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_counts_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "stock_counts_warehouse_location_id_fkey"
    FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "stock_counts_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "stock_counts_posted_adjustment_id_fkey"
    FOREIGN KEY ("posted_adjustment_id") REFERENCES "stock_adjustments" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_stock_counts_tenant_number" ON "stock_counts" ("tenant_id", "count_number");

CREATE INDEX IF NOT EXISTS "idx_stock_counts_tenant_id" ON "stock_counts" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_stock_counts_store_id" ON "stock_counts" ("store_id");

CREATE INDEX IF NOT EXISTS "idx_stock_counts_status" ON "stock_counts" ("status");



CREATE TABLE IF NOT EXISTS "stock_count_items" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "stock_count_id"        UUID NOT NULL,
  "product_variant_id"    UUID NOT NULL,
  "warehouse_location_id" UUID,
  "batch_id"              UUID,
  "qty_snapshot"          DECIMAL(18,4) NOT NULL DEFAULT 0,
  "qty_counted"           DECIMAL(18,4),
  "variance"              DECIMAL(18,4),
  "unit_cost"             DECIMAL(18,4) NOT NULL DEFAULT 0,
  "counted_at"            TIMESTAMPTZ(6),
  "counted_by"            TEXT,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_count_items_stock_count_id_fkey"
    FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_count_items_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "stock_count_items_warehouse_location_id_fkey"
    FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "stock_count_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_stock_count_items"
  ON "stock_count_items" ("stock_count_id", "product_variant_id",
    COALESCE("warehouse_location_id", '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE("batch_id", '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS "idx_stock_count_items_count" ON "stock_count_items" ("stock_count_id");

CREATE INDEX IF NOT EXISTS "idx_stock_count_items_variant" ON "stock_count_items" ("product_variant_id");



CREATE OR REPLACE TRIGGER "trg_stock_counts_updated_at"
BEFORE UPDATE ON "stock_counts" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



ALTER TABLE "stock_counts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "stock_count_items" ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "stock_counts_all_own" ON "stock_counts";
CREATE POLICY "stock_counts_all_own" ON "stock_counts"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "stock_count_items_all_own" ON "stock_count_items";
CREATE POLICY "stock_count_items_all_own" ON "stock_count_items"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "stock_counts" c
    WHERE c."id" = "stock_count_items"."stock_count_id"
      AND c."auth_user_id" = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "stock_counts" c
    WHERE c."id" = "stock_count_items"."stock_count_id"
      AND c."auth_user_id" = auth.uid()));



COMMIT;
