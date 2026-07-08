BEGIN;

-- =============================================================================
-- Stock Adjustments: batch manual / damaged-expired / stocktake adjustments.
-- Header + items tables, plus the apply_stock_adjustment() RPC. See
-- specs/023-stock-adjustments. Depends on inventory_allow_negative() created in
-- the 20260708100000_add_stock_transfers migration.
-- =============================================================================

CREATE TYPE "adjustment_status_enum" AS ENUM ('draft', 'pending', 'approved', 'cancelled');
CREATE TYPE "adjustment_type_enum"   AS ENUM ('manual', 'damage', 'stocktake');
CREATE TYPE "adjustment_reason_enum" AS ENUM ('damage', 'expired', 'theft', 'data_entry_error', 'stocktake_discrepancy', 'other');

CREATE TABLE "stock_adjustments" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "store_id"     UUID NOT NULL,
  "status"       "adjustment_status_enum" NOT NULL DEFAULT 'draft',
  "type"         "adjustment_type_enum" NOT NULL,
  "notes"        TEXT,
  "created_by"   TEXT,
  "approved_by"  TEXT,
  "approved_at"  TIMESTAMPTZ(6),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id" UUID DEFAULT auth.uid(),
  CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_adjustments_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores" ("store_id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "stock_adjustment_items" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "stock_adjustment_id" UUID NOT NULL,
  "product_variant_id"  UUID NOT NULL,
  "qty_before"          DECIMAL(18,4) NOT NULL,
  "qty_after"           DECIMAL(18,4) NOT NULL,
  "qty_adjusted"        DECIMAL(18,4) NOT NULL,
  "unit_cost"           DECIMAL(18,4) NOT NULL DEFAULT 0,
  "reason"              "adjustment_reason_enum",
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_adjustment_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_adjustment_items_stock_adjustment_id_fkey"
    FOREIGN KEY ("stock_adjustment_id") REFERENCES "stock_adjustments" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_adjustment_items_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "idx_stock_adjustments_tenant_id" ON "stock_adjustments" ("tenant_id");
CREATE INDEX "idx_stock_adjustments_store_id" ON "stock_adjustments" ("store_id");
CREATE INDEX "idx_stock_adjustments_status" ON "stock_adjustments" ("status");
CREATE INDEX "idx_stock_adjustment_items_adjustment_id" ON "stock_adjustment_items" ("stock_adjustment_id");
CREATE INDEX "idx_stock_adjustment_items_variant_id" ON "stock_adjustment_items" ("product_variant_id");

CREATE OR REPLACE FUNCTION "set_stock_adjustments_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_stock_adjustments_updated_at"
BEFORE UPDATE ON "stock_adjustments"
FOR EACH ROW EXECUTE FUNCTION "set_stock_adjustments_updated_at"();

ALTER TABLE "stock_adjustments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_adjustment_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_adjustments_all_own" ON "stock_adjustments"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());

CREATE POLICY "stock_adjustment_items_all_own" ON "stock_adjustment_items"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "stock_adjustments" a
    WHERE a."id" = "stock_adjustment_items"."stock_adjustment_id"
      AND a."auth_user_id" = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "stock_adjustments" a
    WHERE a."id" = "stock_adjustment_items"."stock_adjustment_id"
      AND a."auth_user_id" = auth.uid()));

-- =============================================================================
-- apply_stock_adjustment(): atomically apply a batch adjustment.
--   * per item resolves movement_type (damage/expired by reason, else
--     adjustment_in/adjustment_out by delta sign)
--   * damage/expired/adjustment_out cost uses stock_balances.avg_cost (FR-006)
--   * applies qty_adjusted DELTA to the CURRENT live balance (FR-005 stocktake
--     reconciliation — interim sales are preserved, not overwritten)
--   * qty_available is a PLAIN column, explicitly maintained
--   * rewrites the item's qty_before/qty_after/qty_adjusted to reconciled reality
--   * idempotent: rejects already-approved/cancelled adjustments
-- =============================================================================
CREATE OR REPLACE FUNCTION "apply_stock_adjustment"(p_adjustment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h            stock_adjustments%ROWTYPE;
  it           stock_adjustment_items%ROWTYPE;
  v_branch     uuid;
  v_allow_neg  boolean;
  v_bal_qty    numeric;
  v_bal_avg    numeric;
  v_delta      numeric;
  v_new_qty    numeric;
  v_mtype      movement_type_enum;
  v_unit_cost  numeric;
  v_count      int := 0;
BEGIN
  SELECT * INTO h FROM stock_adjustments WHERE id = p_adjustment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADJUSTMENT_NOT_FOUND|%', p_adjustment_id USING ERRCODE = 'P0001';
  END IF;
  IF h.status IN ('approved', 'cancelled') THEN
    RAISE EXCEPTION 'ADJUSTMENT_ALREADY_APPLIED|%', h.status USING ERRCODE = 'P0001';
  END IF;

  v_branch := (SELECT branch_id FROM stores WHERE store_id = h.store_id);
  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'ADJUSTMENT_BRANCH_MISSING|store has no branch' USING ERRCODE = 'P0001';
  END IF;

  v_allow_neg := inventory_allow_negative(h.tenant_id, h.store_id);

  FOR it IN SELECT * FROM stock_adjustment_items WHERE stock_adjustment_id = p_adjustment_id LOOP
    SELECT qty_on_hand, avg_cost INTO v_bal_qty, v_bal_avg
      FROM stock_balances
      WHERE store_id = h.store_id AND product_variant_id = it.product_variant_id
      FOR UPDATE;
    IF NOT FOUND THEN
      v_bal_qty := 0;
      v_bal_avg := 0;
    END IF;

    v_delta   := it.qty_adjusted;              -- captured (qty_after - qty_before) delta
    v_new_qty := v_bal_qty + v_delta;          -- FR-005: apply delta to CURRENT live balance

    IF v_delta = 0 THEN
      CONTINUE;                                -- no-op line, skip ledger noise
    END IF;

    v_mtype := CASE
                 WHEN h.type = 'damage' AND it.reason = 'expired' THEN 'expired'::movement_type_enum
                 WHEN h.type = 'damage'                            THEN 'damage'::movement_type_enum
                 WHEN v_delta >= 0                                 THEN 'adjustment_in'::movement_type_enum
                 ELSE 'adjustment_out'::movement_type_enum
               END;

    -- FR-006: outflow / damage / expired cost is strictly avg_cost (no override)
    v_unit_cost := CASE
                     WHEN v_mtype IN ('damage', 'expired', 'adjustment_out') THEN v_bal_avg
                     ELSE COALESCE(NULLIF(it.unit_cost, 0), NULLIF(v_bal_avg, 0), 0)
                   END;

    IF v_new_qty < 0 AND NOT v_allow_neg THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK|%', it.product_variant_id USING ERRCODE = 'P0001';
    END IF;

    -- Apply to balance (upsert so a first-ever inflow creates the row)
    INSERT INTO stock_balances (tenant_id, store_id, product_variant_id, qty_on_hand, qty_available, avg_cost, last_movement_at)
      VALUES (h.tenant_id, h.store_id, it.product_variant_id, v_new_qty, v_new_qty, v_unit_cost, now())
    ON CONFLICT (store_id, product_variant_id) DO UPDATE
      SET qty_on_hand   = v_new_qty,
          qty_available = v_new_qty - stock_balances.qty_reserved,
          avg_cost      = CASE
                            WHEN v_mtype = 'adjustment_in' AND v_new_qty > 0
                              THEN (v_bal_qty * v_bal_avg + v_delta * v_unit_cost) / v_new_qty
                            ELSE stock_balances.avg_cost
                          END,
          last_movement_at = now(),
          updated_at       = now();

    -- FR-007: ledger row linked to the adjustment document
    INSERT INTO inventory_movements
      (auth_user_id, branch_id, store_id, product_variant_id, movement_type,
       reference_type, reference_id, qty_in, qty_out, unit_cost, total_cost, movement_date, remarks, created_by)
      VALUES (h.tenant_id, v_branch, h.store_id, it.product_variant_id, v_mtype,
              'stock_adjustment', p_adjustment_id,
              CASE WHEN v_delta > 0 THEN v_delta ELSE 0 END,
              CASE WHEN v_delta < 0 THEN -v_delta ELSE 0 END,
              v_unit_cost, abs(v_delta) * v_unit_cost, now(),
              COALESCE(it.reason::text, h.notes), h.approved_by);

    -- Persist reconciled reality onto the item (audit-honest for stocktakes)
    UPDATE stock_adjustment_items
      SET qty_before   = v_bal_qty,
          qty_after    = v_new_qty,
          qty_adjusted = v_delta
      WHERE id = it.id;

    UPDATE product_variants
      SET stock_quantity = COALESCE(
            (SELECT round(SUM(qty_on_hand)) FROM stock_balances WHERE product_variant_id = it.product_variant_id), 0)
      WHERE id = it.product_variant_id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE stock_adjustments
    SET status      = 'approved',
        approved_by = COALESCE(approved_by, auth.uid()::text),
        approved_at = now(),
        updated_at  = now()
    WHERE id = p_adjustment_id;

  RETURN jsonb_build_object('adjustment_id', p_adjustment_id, 'status', 'approved', 'items_applied', v_count);
END;
$$;

COMMIT;
