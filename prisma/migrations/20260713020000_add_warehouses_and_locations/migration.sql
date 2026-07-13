BEGIN;



-- =============================================================================
-- Warehouse domain (feature 028): warehouses sit BESIDE stores (a store keeps
-- being the stock anchor for stock_balances); each store gets a default
-- warehouse with a default zone, and stock_by_location adds bin-level
-- granularity that must always reconcile to stock_balances:
--   SUM(stock_by_location.qty_on_hand) per (store, variant)
--     == stock_balances.qty_on_hand                      (invariant #1)
-- Hierarchy: warehouse -> zone -> rack -> shelf -> bin (self-referential,
-- unlimited depth via warehouse_locations.parent_id).
-- =============================================================================

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'location_type_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "location_type_enum" AS ENUM ('zone', 'rack', 'shelf', 'bin');
  END IF;
END $do$;



-- Shared updated_at trigger fn for all new inventory-domain tables
CREATE OR REPLACE FUNCTION "inventory_set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE TABLE IF NOT EXISTS "warehouses" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "branch_id"    UUID,
  "store_id"     UUID,
  "code"         VARCHAR(30) NOT NULL,
  "name"         VARCHAR(120) NOT NULL,
  "is_default"   BOOLEAN NOT NULL DEFAULT false,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "address"      TEXT,
  "notes"        TEXT,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id" UUID DEFAULT auth.uid(),
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouses_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "warehouses_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);



CREATE UNIQUE INDEX IF NOT EXISTS "uq_warehouses_tenant_code" ON "warehouses" ("tenant_id", "code");

CREATE INDEX IF NOT EXISTS "idx_warehouses_tenant_id" ON "warehouses" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_warehouses_branch_id" ON "warehouses" ("branch_id");

CREATE INDEX IF NOT EXISTS "idx_warehouses_store_id" ON "warehouses" ("store_id");



CREATE TABLE IF NOT EXISTS "warehouse_locations" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL,
  "warehouse_id"  UUID NOT NULL,
  "parent_id"     UUID,
  "location_type" "location_type_enum" NOT NULL,
  "code"          VARCHAR(50) NOT NULL,
  "name"          VARCHAR(120),
  "path"          TEXT,
  "is_default"    BOOLEAN NOT NULL DEFAULT false,
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "is_pickable"   BOOLEAN NOT NULL DEFAULT true,
  "is_receivable" BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"  UUID DEFAULT auth.uid(),
  CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouse_locations_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "warehouse_locations_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);



CREATE UNIQUE INDEX IF NOT EXISTS "uq_warehouse_locations_parent_code"
  ON "warehouse_locations" ("warehouse_id", COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::uuid), "code");

CREATE INDEX IF NOT EXISTS "idx_warehouse_locations_tenant_id" ON "warehouse_locations" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_warehouse_locations_warehouse_id" ON "warehouse_locations" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_warehouse_locations_parent_id" ON "warehouse_locations" ("parent_id");



-- Bin-level stock. store_id stays the compat anchor; batch_id FK arrives with
-- the batches migration (20260713040000).
CREATE TABLE IF NOT EXISTS "stock_by_location" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID NOT NULL,
  "store_id"              UUID NOT NULL,
  "warehouse_id"          UUID NOT NULL,
  "warehouse_location_id" UUID NOT NULL,
  "product_variant_id"    UUID NOT NULL,
  "batch_id"              UUID,
  "qty_on_hand"           DECIMAL(18,4) NOT NULL DEFAULT 0,
  "qty_reserved"          DECIMAL(18,4) NOT NULL DEFAULT 0,
  "last_movement_at"      TIMESTAMPTZ(6),
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"          UUID DEFAULT auth.uid(),
  CONSTRAINT "stock_by_location_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_by_location_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_by_location_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_by_location_warehouse_location_id_fkey"
    FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_by_location_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);



CREATE UNIQUE INDEX IF NOT EXISTS "uq_stock_by_location"
  ON "stock_by_location" ("warehouse_location_id", "product_variant_id", COALESCE("batch_id", '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS "idx_stock_by_location_store_variant" ON "stock_by_location" ("store_id", "product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_stock_by_location_tenant_id" ON "stock_by_location" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_stock_by_location_warehouse_id" ON "stock_by_location" ("warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_stock_by_location_batch_id" ON "stock_by_location" ("batch_id");



CREATE OR REPLACE TRIGGER "trg_warehouses_updated_at"
BEFORE UPDATE ON "warehouses"
FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_warehouse_locations_updated_at"
BEFORE UPDATE ON "warehouse_locations"
FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_stock_by_location_updated_at"
BEFORE UPDATE ON "stock_by_location"
FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "warehouse_locations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "stock_by_location" ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "warehouses_all_own" ON "warehouses";
CREATE POLICY "warehouses_all_own" ON "warehouses"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());



DROP POLICY IF EXISTS "warehouse_locations_all_own" ON "warehouse_locations";
CREATE POLICY "warehouse_locations_all_own" ON "warehouse_locations"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());



DROP POLICY IF EXISTS "stock_by_location_all_own" ON "stock_by_location";
CREATE POLICY "stock_by_location_all_own" ON "stock_by_location"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());



-- =============================================================================
-- get_default_location(store): the default zone of the store's default
-- warehouse. Used by the movement engine as the location fallback.
-- =============================================================================
CREATE OR REPLACE FUNCTION "get_default_location"(p_store_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT wl.id
  FROM warehouses w
  JOIN warehouse_locations wl ON wl.warehouse_id = w.id AND wl.is_default = true
  WHERE w.store_id = p_store_id AND w.is_default = true
  LIMIT 1;
$$;



-- =============================================================================
-- Backfill: default warehouse per store -> default zone -> seed
-- stock_by_location from stock_balances so invariant #1 holds from day one.
-- Tenant resolution mirrors the stock tables: store.auth_user_id, else the
-- tenant already recorded on that store's balances. Stores with no resolvable
-- tenant are skipped (they hold no tenant data).
-- =============================================================================
INSERT INTO "warehouses" ("tenant_id", "branch_id", "store_id", "code", "name", "is_default", "auth_user_id")
SELECT
  COALESCE(s.auth_user_id, sb.tenant_id),
  s.branch_id,
  s.store_id,
  'WH-' || left(s.store_id::text, 8),
  COALESCE(s.name, 'Warehouse') || ' (Default)',
  true,
  COALESCE(s.auth_user_id, sb.tenant_id)
FROM stores s
LEFT JOIN LATERAL (
  SELECT tenant_id FROM stock_balances WHERE store_id = s.store_id LIMIT 1
) sb ON true
WHERE COALESCE(s.auth_user_id, sb.tenant_id) IS NOT NULL;



INSERT INTO "warehouse_locations" ("tenant_id", "warehouse_id", "location_type", "code", "name", "path", "is_default", "auth_user_id")
SELECT w.tenant_id, w.id, 'zone', 'DEFAULT', 'Default Zone', '/DEFAULT', true, w.auth_user_id
FROM warehouses w
WHERE w.is_default = true;



INSERT INTO "stock_by_location"
  ("tenant_id", "store_id", "warehouse_id", "warehouse_location_id", "product_variant_id",
   "qty_on_hand", "qty_reserved", "last_movement_at", "auth_user_id")
SELECT
  b.tenant_id, b.store_id, w.id, wl.id, b.product_variant_id,
  b.qty_on_hand, b.qty_reserved, b.last_movement_at, b.auth_user_id
FROM stock_balances b
JOIN warehouses w ON w.store_id = b.store_id AND w.is_default = true
JOIN warehouse_locations wl ON wl.warehouse_id = w.id AND wl.is_default = true;



COMMIT;
