BEGIN;



-- =============================================================================
-- Purchase documents:
--   * purchase_orders gains a proper server-enforced lifecycle
--     (draft -> approved -> sent -> partially_received -> received -> closed)
--     while the legacy free-text status column is kept in sync one-way so old
--     readers keep working.
--   * goods_receipts / goods_receipt_items: the receiving document. Inventory
--     only ever increases when a goods receipt is POSTED (movement engine).
--   * purchase_requisitions / items: demand capture feeding PO creation and
--     the reorder engine.
-- =============================================================================

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'po_lifecycle_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "po_lifecycle_status_enum" AS ENUM
      ('draft', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled');
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'receipt_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "receipt_status_enum" AS ENUM ('draft', 'posted', 'cancelled');
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'requisition_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "requisition_status_enum" AS ENUM
      ('draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled');
  END IF;
END $do$;



-- ── purchase_orders lifecycle (additive; legacy varchar status kept) ────────
ALTER TABLE "purchase_orders"
  ADD COLUMN IF NOT EXISTS "lifecycle_status" "po_lifecycle_status_enum",
  ADD COLUMN IF NOT EXISTS "branch_id"        UUID,
  ADD COLUMN IF NOT EXISTS "store_id"         UUID,
  ADD COLUMN IF NOT EXISTS "warehouse_id"     UUID,
  ADD COLUMN IF NOT EXISTS "approved_by"      TEXT,
  ADD COLUMN IF NOT EXISTS "approved_at"      TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "sent_at"          TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "closed_at"        TIMESTAMPTZ(6);



ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_branch_id_fkey", DROP CONSTRAINT IF EXISTS "purchase_orders_store_id_fkey", DROP CONSTRAINT IF EXISTS "purchase_orders_warehouse_id_fkey";
ALTER TABLE "purchase_orders"
  ADD CONSTRAINT "purchase_orders_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "purchase_orders_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "purchase_orders_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;



-- PO lines get a proper variant reference (receiving is variant-level; the
-- legacy product_id column stays for old readers)
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "product_variant_id" UUID;

ALTER TABLE "purchase_order_items" DROP CONSTRAINT IF EXISTS "purchase_order_items_product_variant_id_fkey";
ALTER TABLE "purchase_order_items"
  ADD CONSTRAINT "purchase_order_items_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_purchase_order_items_variant" ON "purchase_order_items" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_purchase_order_items_po" ON "purchase_order_items" ("po_id");



-- Backfill lifecycle from the legacy free-text status
UPDATE "purchase_orders" SET "lifecycle_status" =
  CASE lower(COALESCE("status", ''))
    WHEN 'pending'   THEN 'approved'::po_lifecycle_status_enum
    WHEN 'partial'   THEN 'partially_received'::po_lifecycle_status_enum
    WHEN 'received'  THEN 'received'::po_lifecycle_status_enum
    WHEN 'cancelled' THEN 'cancelled'::po_lifecycle_status_enum
    ELSE 'draft'::po_lifecycle_status_enum
  END
WHERE "lifecycle_status" IS NULL;



CREATE INDEX IF NOT EXISTS "idx_purchase_orders_lifecycle_status" ON "purchase_orders" ("lifecycle_status");



-- One-way sync: lifecycle_status drives the legacy varchar. Old writers that
-- only touch "status" are unaffected (they don't fire on lifecycle change).
CREATE OR REPLACE FUNCTION "sync_po_legacy_status"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."status" := CASE NEW."lifecycle_status"
    WHEN 'draft'              THEN 'pending'
    WHEN 'approved'           THEN 'pending'
    WHEN 'sent'               THEN 'pending'
    WHEN 'partially_received' THEN 'partial'
    WHEN 'received'           THEN 'received'
    WHEN 'closed'             THEN 'received'
    WHEN 'cancelled'          THEN 'cancelled'
    ELSE NEW."status"
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE TRIGGER "trg_po_status_sync"
BEFORE INSERT OR UPDATE OF "lifecycle_status" ON "purchase_orders"
FOR EACH ROW
WHEN (NEW."lifecycle_status" IS NOT NULL)
EXECUTE FUNCTION "sync_po_legacy_status"();



-- ── goods receipts ───────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS "goods_receipts_seq";



CREATE TABLE IF NOT EXISTS "goods_receipts" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID NOT NULL,
  "receipt_number"    VARCHAR(30) NOT NULL DEFAULT ('GR-' || lpad(nextval('goods_receipts_seq')::text, 6, '0')),
  "purchase_order_id" INTEGER,
  "supplier_id"       INTEGER,
  "store_id"          UUID NOT NULL,
  "warehouse_id"      UUID,
  "status"            "receipt_status_enum" NOT NULL DEFAULT 'draft',
  "received_date"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "notes"             TEXT,
  "created_by"        TEXT,
  "posted_by"         TEXT,
  "posted_at"         TIMESTAMPTZ(6),
  "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"      UUID DEFAULT auth.uid(),
  CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "goods_receipts_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("po_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipts_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("supplier_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipts_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipts_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_goods_receipts_tenant_number" ON "goods_receipts" ("tenant_id", "receipt_number");

CREATE INDEX IF NOT EXISTS "idx_goods_receipts_tenant_id" ON "goods_receipts" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_goods_receipts_po_id" ON "goods_receipts" ("purchase_order_id");

CREATE INDEX IF NOT EXISTS "idx_goods_receipts_store_id" ON "goods_receipts" ("store_id");

CREATE INDEX IF NOT EXISTS "idx_goods_receipts_status" ON "goods_receipts" ("status");



CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
  "id"                     UUID NOT NULL DEFAULT gen_random_uuid(),
  "goods_receipt_id"       UUID NOT NULL,
  "purchase_order_item_id" INTEGER,
  "product_variant_id"     UUID NOT NULL,
  "qty_received"           DECIMAL(18,4) NOT NULL,
  "uom_id"                 UUID,
  "unit_cost"              DECIMAL(18,4) NOT NULL DEFAULT 0,
  "warehouse_location_id"  UUID,
  "batch_id"               UUID,
  "batch_number"           VARCHAR(60),
  "expiry_date"            DATE,
  "serial_numbers"         JSONB,
  "created_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "goods_receipt_items_goods_receipt_id_fkey"
    FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipt_items_purchase_order_item_id_fkey"
    FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items" ("po_item_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipt_items_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipt_items_uom_id_fkey"
    FOREIGN KEY ("uom_id") REFERENCES "uoms" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipt_items_warehouse_location_id_fkey"
    FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipt_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "goods_receipt_items_qty_positive" CHECK ("qty_received" > 0)
);

CREATE INDEX IF NOT EXISTS "idx_goods_receipt_items_receipt" ON "goods_receipt_items" ("goods_receipt_id");

CREATE INDEX IF NOT EXISTS "idx_goods_receipt_items_variant" ON "goods_receipt_items" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_goods_receipt_items_po_item" ON "goods_receipt_items" ("purchase_order_item_id");



-- ── purchase requisitions ────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS "purchase_requisitions_seq";



CREATE TABLE IF NOT EXISTS "purchase_requisitions" (
  "id"                          UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                   UUID NOT NULL,
  "requisition_number"          VARCHAR(30) NOT NULL DEFAULT ('PR-' || lpad(nextval('purchase_requisitions_seq')::text, 6, '0')),
  "branch_id"                   UUID,
  "store_id"                    UUID,
  "status"                      "requisition_status_enum" NOT NULL DEFAULT 'draft',
  "source"                      VARCHAR(20) NOT NULL DEFAULT 'manual',
  "requested_by"                TEXT,
  "approved_by"                 TEXT,
  "approved_at"                 TIMESTAMPTZ(6),
  "converted_purchase_order_id" INTEGER,
  "needed_by"                   DATE,
  "notes"                       TEXT,
  "created_at"                  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"                UUID DEFAULT auth.uid(),
  CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_requisitions_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "purchase_requisitions_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "purchase_requisitions_converted_po_fkey"
    FOREIGN KEY ("converted_purchase_order_id") REFERENCES "purchase_orders" ("po_id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_purchase_requisitions_tenant_number" ON "purchase_requisitions" ("tenant_id", "requisition_number");

CREATE INDEX IF NOT EXISTS "idx_purchase_requisitions_tenant_id" ON "purchase_requisitions" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_purchase_requisitions_status" ON "purchase_requisitions" ("status");



CREATE TABLE IF NOT EXISTS "purchase_requisition_items" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "requisition_id"        UUID NOT NULL,
  "product_variant_id"    UUID NOT NULL,
  "qty_requested"         DECIMAL(18,4) NOT NULL,
  "uom_id"                UUID,
  "preferred_supplier_id" INTEGER,
  "est_unit_cost"         DECIMAL(18,4) NOT NULL DEFAULT 0,
  "reason"                TEXT,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "purchase_requisition_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_requisition_items_requisition_id_fkey"
    FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "purchase_requisition_items_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "purchase_requisition_items_uom_id_fkey"
    FOREIGN KEY ("uom_id") REFERENCES "uoms" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "purchase_requisition_items_supplier_fkey"
    FOREIGN KEY ("preferred_supplier_id") REFERENCES "suppliers" ("supplier_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "purchase_requisition_items_qty_positive" CHECK ("qty_requested" > 0)
);

CREATE INDEX IF NOT EXISTS "idx_purchase_requisition_items_requisition" ON "purchase_requisition_items" ("requisition_id");

CREATE INDEX IF NOT EXISTS "idx_purchase_requisition_items_variant" ON "purchase_requisition_items" ("product_variant_id");



CREATE OR REPLACE TRIGGER "trg_goods_receipts_updated_at"
BEFORE UPDATE ON "goods_receipts" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_purchase_requisitions_updated_at"
BEFORE UPDATE ON "purchase_requisitions" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



ALTER TABLE "goods_receipts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "goods_receipt_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "purchase_requisitions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "purchase_requisition_items" ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "goods_receipts_all_own" ON "goods_receipts";
CREATE POLICY "goods_receipts_all_own" ON "goods_receipts"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "goods_receipt_items_all_own" ON "goods_receipt_items";
CREATE POLICY "goods_receipt_items_all_own" ON "goods_receipt_items"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "goods_receipts" g
    WHERE g."id" = "goods_receipt_items"."goods_receipt_id"
      AND g."auth_user_id" = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "goods_receipts" g
    WHERE g."id" = "goods_receipt_items"."goods_receipt_id"
      AND g."auth_user_id" = auth.uid()));

DROP POLICY IF EXISTS "purchase_requisitions_all_own" ON "purchase_requisitions";
CREATE POLICY "purchase_requisitions_all_own" ON "purchase_requisitions"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "purchase_requisition_items_all_own" ON "purchase_requisition_items";
CREATE POLICY "purchase_requisition_items_all_own" ON "purchase_requisition_items"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "purchase_requisitions" r
    WHERE r."id" = "purchase_requisition_items"."requisition_id"
      AND r."auth_user_id" = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "purchase_requisitions" r
    WHERE r."id" = "purchase_requisition_items"."requisition_id"
      AND r."auth_user_id" = auth.uid()));



COMMIT;
