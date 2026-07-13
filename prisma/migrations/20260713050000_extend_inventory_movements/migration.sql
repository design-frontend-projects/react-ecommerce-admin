BEGIN;



-- =============================================================================
-- Extend the immutable inventory_movements ledger with full ERP audit columns:
-- warehouse/location dimension, batch, before/after balances, explicit source/
-- destination documents, movement grouping (e.g. the two legs of a transfer),
-- engine idempotency keys and structured reason codes. All nullable — historic
-- rows are untouched.
-- =============================================================================

ALTER TABLE "inventory_movements"
  ADD COLUMN IF NOT EXISTS "warehouse_id"               UUID,
  ADD COLUMN IF NOT EXISTS "warehouse_location_id"      UUID,
  ADD COLUMN IF NOT EXISTS "batch_id"                   UUID,
  ADD COLUMN IF NOT EXISTS "qty_before"                 DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "qty_after"                  DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "source_document_type"       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "source_document_id"         UUID,
  ADD COLUMN IF NOT EXISTS "dest_store_id"              UUID,
  ADD COLUMN IF NOT EXISTS "dest_warehouse_location_id" UUID,
  ADD COLUMN IF NOT EXISTS "movement_group_id"          UUID,
  ADD COLUMN IF NOT EXISTS "idempotency_key"            TEXT,
  ADD COLUMN IF NOT EXISTS "reason_code"                VARCHAR(40);



ALTER TABLE "inventory_movements" DROP CONSTRAINT IF EXISTS "inventory_movements_warehouse_id_fkey", DROP CONSTRAINT IF EXISTS "inventory_movements_warehouse_location_id_fkey", DROP CONSTRAINT IF EXISTS "inventory_movements_batch_id_fkey", DROP CONSTRAINT IF EXISTS "inventory_movements_dest_store_id_fkey";
ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_warehouse_id_fkey"
    FOREIGN KEY ("warehouse_id") REFERENCES "warehouses" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "inventory_movements_warehouse_location_id_fkey"
    FOREIGN KEY ("warehouse_location_id") REFERENCES "warehouse_locations" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "inventory_movements_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "product_batches" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "inventory_movements_dest_store_id_fkey"
    FOREIGN KEY ("dest_store_id") REFERENCES "stores" ("store_id")
    ON DELETE SET NULL ON UPDATE NO ACTION;



-- Fast stock lookup / movement history / dashboard indexes
CREATE INDEX IF NOT EXISTS "idx_inv_mov_variant_date" ON "inventory_movements" ("product_variant_id", "movement_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_inv_mov_store_date" ON "inventory_movements" ("store_id", "movement_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_inv_mov_reference" ON "inventory_movements" ("reference_type", "reference_id");

CREATE INDEX IF NOT EXISTS "idx_inv_mov_source_doc" ON "inventory_movements" ("source_document_type", "source_document_id");

CREATE INDEX IF NOT EXISTS "idx_inv_mov_group" ON "inventory_movements" ("movement_group_id");

CREATE INDEX IF NOT EXISTS "idx_inv_mov_batch" ON "inventory_movements" ("batch_id");

CREATE INDEX IF NOT EXISTS "idx_inv_mov_tenant_date" ON "inventory_movements" ("auth_user_id", "movement_date" DESC);



-- Engine idempotency: at most one applied movement per (tenant, key)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_inv_mov_idempotency"
  ON "inventory_movements" ("auth_user_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;



CREATE INDEX IF NOT EXISTS "idx_stock_balances_tenant_variant" ON "stock_balances" ("tenant_id", "product_variant_id");



COMMIT;
