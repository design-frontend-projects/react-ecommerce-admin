BEGIN;



-- =============================================================================
-- Sales orders + stock reservations.
-- Lifecycle: draft -> confirmed -> picking -> packed -> delivered -> invoiced
--            -> completed (cancelled from any pre-delivered state).
-- Confirming reserves stock (qty_reserved via 'reserved' movements); fulfilment
-- converts reservations to physical outflow ('reservation_conversion').
-- POS keeps selling direct — reservations are for the order-to-fulfil flow.
-- NOTE: enum is named sales_order_status_enum / stock_reservation_status_enum
-- because a `reservation_status` enum already exists (restaurant tables).
-- =============================================================================

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'sales_order_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "sales_order_status_enum" AS ENUM
      ('draft', 'confirmed', 'picking', 'packed', 'delivered', 'invoiced', 'completed', 'cancelled');
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'stock_reservation_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "stock_reservation_status_enum" AS ENUM ('active', 'consumed', 'released', 'expired');
  END IF;
END $do$;



CREATE SEQUENCE IF NOT EXISTS "sales_orders_seq";



CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,
  "order_number"     VARCHAR(30) NOT NULL DEFAULT ('SO-' || lpad(nextval('sales_orders_seq')::text, 6, '0')),
  "customer_id"      INTEGER,
  "branch_id"        UUID,
  "store_id"         UUID NOT NULL,
  "warehouse_id"     UUID,
  "status"           "sales_order_status_enum" NOT NULL DEFAULT 'draft',
  "order_date"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "expected_date"    DATE,
  "subtotal"         DECIMAL(18,4) NOT NULL DEFAULT 0,
  "discount_amount"  DECIMAL(18,4) NOT NULL DEFAULT 0,
  "tax_amount"       DECIMAL(18,4) NOT NULL DEFAULT 0,
  "total_amount"     DECIMAL(18,4) NOT NULL DEFAULT 0,
  "sales_invoice_id" UUID,
  "confirmed_by"     TEXT,
  "confirmed_at"     TIMESTAMPTZ(6),
  "notes"            TEXT,
  "created_by"       TEXT,
  "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"     UUID DEFAULT auth.uid(),
  CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_orders_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "sales_orders_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "sales_orders_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "sales_orders_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "sales_orders_sales_invoice_id_fkey"
    FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_orders_tenant_number" ON "sales_orders" ("tenant_id", "order_number");

CREATE INDEX IF NOT EXISTS "idx_sales_orders_tenant_id" ON "sales_orders" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_sales_orders_store_id" ON "sales_orders" ("store_id");

CREATE INDEX IF NOT EXISTS "idx_sales_orders_status" ON "sales_orders" ("status");

CREATE INDEX IF NOT EXISTS "idx_sales_orders_customer_id" ON "sales_orders" ("customer_id");



CREATE TABLE IF NOT EXISTS "sales_order_items" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "sales_order_id"     UUID NOT NULL,
  "product_variant_id" UUID NOT NULL,
  "line_no"            INTEGER NOT NULL DEFAULT 1,
  "qty_ordered"        DECIMAL(18,4) NOT NULL,
  "qty_reserved"       DECIMAL(18,4) NOT NULL DEFAULT 0,
  "qty_fulfilled"      DECIMAL(18,4) NOT NULL DEFAULT 0,
  "uom_id"             UUID,
  "unit_price"         DECIMAL(18,4) NOT NULL DEFAULT 0,
  "discount_amount"    DECIMAL(18,4) NOT NULL DEFAULT 0,
  "tax_amount"         DECIMAL(18,4) NOT NULL DEFAULT 0,
  "line_total"         DECIMAL(18,4) NOT NULL DEFAULT 0,
  "batch_id"           UUID,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_order_items_sales_order_id_fkey"
    FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "sales_order_items_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "sales_order_items_uom_id_fkey"
    FOREIGN KEY ("uom_id") REFERENCES "uoms" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "sales_order_items_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "sales_order_items_qty_positive" CHECK ("qty_ordered" > 0)
);

CREATE INDEX IF NOT EXISTS "idx_sales_order_items_order" ON "sales_order_items" ("sales_order_id");

CREATE INDEX IF NOT EXISTS "idx_sales_order_items_variant" ON "sales_order_items" ("product_variant_id");



CREATE TABLE IF NOT EXISTS "stock_reservations" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID NOT NULL,
  "store_id"              UUID NOT NULL,
  "product_variant_id"    UUID NOT NULL,
  "batch_id"              UUID,
  "warehouse_location_id" UUID,
  "qty"                   DECIMAL(18,4) NOT NULL,
  "qty_consumed"          DECIMAL(18,4) NOT NULL DEFAULT 0,
  "status"                "stock_reservation_status_enum" NOT NULL DEFAULT 'active',
  "reference_type"        VARCHAR(40) NOT NULL DEFAULT 'sales_order',
  "reference_id"          UUID,
  "reference_item_id"     UUID,
  "expires_at"            TIMESTAMPTZ(6),
  "released_at"           TIMESTAMPTZ(6),
  "consumed_at"           TIMESTAMPTZ(6),
  "created_by"            TEXT,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"          UUID DEFAULT auth.uid(),
  CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_reservations_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_reservations_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_reservations_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "stock_reservations_warehouse_location_id_fkey"
    FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "stock_reservations_qty_positive" CHECK ("qty" > 0)
);

CREATE INDEX IF NOT EXISTS "idx_stock_reservations_store_variant_status"
  ON "stock_reservations" ("store_id", "product_variant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_stock_reservations_tenant_id" ON "stock_reservations" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_stock_reservations_reference" ON "stock_reservations" ("reference_type", "reference_id");



CREATE OR REPLACE TRIGGER "trg_sales_orders_updated_at"
BEFORE UPDATE ON "sales_orders" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_stock_reservations_updated_at"
BEFORE UPDATE ON "stock_reservations" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



ALTER TABLE "sales_orders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "sales_order_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "stock_reservations" ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "sales_orders_all_own" ON "sales_orders";
CREATE POLICY "sales_orders_all_own" ON "sales_orders"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "sales_order_items_all_own" ON "sales_order_items";
CREATE POLICY "sales_order_items_all_own" ON "sales_order_items"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "sales_orders" o
    WHERE o."id" = "sales_order_items"."sales_order_id"
      AND o."auth_user_id" = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "sales_orders" o
    WHERE o."id" = "sales_order_items"."sales_order_id"
      AND o."auth_user_id" = auth.uid()));

DROP POLICY IF EXISTS "stock_reservations_all_own" ON "stock_reservations";
CREATE POLICY "stock_reservations_all_own" ON "stock_reservations"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());



COMMIT;
