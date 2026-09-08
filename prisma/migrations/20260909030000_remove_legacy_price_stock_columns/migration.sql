-- Migration: 20260909030000_remove_legacy_price_stock_columns
-- Description: Remove redundant base_price from products, and price, cost_price,
-- stock_quantity, min_stock from product_variants.
-- Update dependent RPC functions to maintain inventory movement & reorder integrity.

BEGIN;

-- 1. Safety Backfill: ensure any variant prices/costs exist in default price list
INSERT INTO "price_list_items" (
  "tenant_id", "price_list_id", "product_variant_id", "product_id", "price", "cost_price", "min_price", "max_discount_percent"
)
SELECT 
  pv.tenant_id,
  (SELECT id FROM price_list pl WHERE pl.tenant_id = pv.tenant_id AND pl.is_default = true LIMIT 1),
  pv.id,
  pv.product_id,
  COALESCE(pv.price, 0),
  COALESCE(pv.cost_price, 0),
  0,
  0
FROM product_variants pv
WHERE (SELECT id FROM price_list pl WHERE pl.tenant_id = pv.tenant_id AND pl.is_default = true LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM price_list_items pli WHERE pli.product_variant_id = pv.id
  )
ON CONFLICT ("price_list_id", "product_variant_id") DO NOTHING;

-- 2. Safety Backfill: ensure any variant stock quantities exist in stock_balances
INSERT INTO "stock_balances" (
  "id", "tenant_id", "warehouse_id", "product_variant_id", "condition",
  "qty_on_hand", "qty_reserved", "qty_available", "avg_cost", "created_at", "updated_at"
)
SELECT 
  gen_random_uuid(),
  pv.tenant_id,
  (SELECT id FROM warehouses WHERE tenant_id = pv.tenant_id LIMIT 1),
  pv.id,
  'good'::stock_condition_enum,
  COALESCE(pv.stock_quantity, 0),
  0,
  COALESCE(pv.stock_quantity, 0),
  COALESCE(pv.cost_price, 0),
  NOW(),
  NOW()
FROM product_variants pv
WHERE NOT EXISTS (
  SELECT 1 FROM stock_balances sb WHERE sb.product_variant_id = pv.id
);

-- 3. Replace resync_variant_stock with a safe no-op (stock is tracked via stock_balances)
CREATE OR REPLACE FUNCTION "resync_variant_stock"(p_variant_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- No-op: stock_quantity column removed from product_variants, stock is tracked via stock_balances
  RETURN;
END;
$$;

-- 4. Update apply_stock_adjustment: remove UPDATE product_variants SET stock_quantity
CREATE OR REPLACE FUNCTION "apply_stock_adjustment"(p_adjustment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h record;
  it record;
  v_bal_qty decimal;
  v_bal_avg decimal;
  v_delta decimal;
  v_new_qty decimal;
  v_unit_cost decimal;
  v_branch uuid;
  v_allow_neg boolean;
  v_mtype movement_type_enum;
  v_count integer := 0;
BEGIN
  SELECT * INTO h FROM stock_adjustments WHERE id = p_adjustment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADJUSTMENT_NOT_FOUND|%', p_adjustment_id USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'draft' THEN
    RAISE EXCEPTION 'ADJUSTMENT_NOT_DRAFT|current status: %', h.status USING ERRCODE = 'P0001';
  END IF;

  SELECT branch_id, allow_negative_stock INTO v_branch, v_allow_neg FROM stores WHERE store_id = h.store_id;
  IF v_allow_neg IS NULL THEN v_allow_neg := false; END IF;

  FOR it IN
    SELECT * FROM stock_adjustment_items
    WHERE stock_adjustment_id = p_adjustment_id
    ORDER BY id
    FOR UPDATE
  LOOP
    SELECT qty_on_hand, avg_cost INTO v_bal_qty, v_bal_avg
      FROM stock_balances
      WHERE store_id = h.store_id AND product_variant_id = it.product_variant_id
      FOR UPDATE;
    IF NOT FOUND THEN
      v_bal_qty := 0;
      v_bal_avg := 0;
    END IF;

    IF it.qty_counted IS NOT NULL THEN
      v_new_qty := it.qty_counted;
      v_delta   := it.qty_counted - v_bal_qty;
    ELSIF it.qty_adjusted IS NOT NULL THEN
      v_delta   := it.qty_adjusted;
      v_new_qty := v_bal_qty + it.qty_adjusted;
    ELSE
      CONTINUE;
    END IF;

    v_mtype := CASE
                 WHEN h.type = 'damage' AND it.reason = 'expired' THEN 'expired'::movement_type_enum
                 WHEN h.type = 'damage'                            THEN 'damage'::movement_type_enum
                 WHEN v_delta >= 0                                 THEN 'adjustment_in'::movement_type_enum
                 ELSE 'adjustment_out'::movement_type_enum
               END;

    v_unit_cost := CASE
                     WHEN v_mtype IN ('damage', 'expired', 'adjustment_out') THEN v_bal_avg
                     ELSE COALESCE(NULLIF(it.unit_cost, 0), NULLIF(v_bal_avg, 0), 0)
                   END;

    IF v_new_qty < 0 AND NOT v_allow_neg THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK|%', it.product_variant_id USING ERRCODE = 'P0001';
    END IF;

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

    INSERT INTO inventory_movements
      (auth_user_id, branch_id, store_id, product_variant_id, movement_type,
       reference_type, reference_id, qty_in, qty_out, unit_cost, total_cost, movement_date, remarks, created_by)
      VALUES (h.tenant_id, v_branch, h.store_id, it.product_variant_id, v_mtype,
              'stock_adjustment', p_adjustment_id,
              CASE WHEN v_delta > 0 THEN v_delta ELSE 0 END,
              CASE WHEN v_delta < 0 THEN -v_delta ELSE 0 END,
              v_unit_cost, abs(v_delta) * v_unit_cost, now(),
              COALESCE(it.reason::text, h.notes), h.approved_by);

    UPDATE stock_adjustment_items
      SET qty_before   = v_bal_qty,
          qty_after    = v_new_qty,
          qty_adjusted = v_delta
      WHERE id = it.id;

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

-- 5. Update receive_stock_transfer: remove UPDATE product_variants SET stock_quantity
CREATE OR REPLACE FUNCTION "receive_stock_transfer"(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h record;
  it record;
  v_src_qty decimal;
  v_src_avg decimal;
  v_unit_cost decimal;
  v_from_branch uuid;
  v_to_branch uuid;
  v_allow_neg boolean;
  v_count integer := 0;
BEGIN
  SELECT * INTO h FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_NOT_FOUND|%', p_transfer_id USING ERRCODE = 'P0001';
  END IF;
  IF h.status NOT IN ('draft', 'requested', 'in_transit') THEN
    RAISE EXCEPTION 'TRANSFER_CANNOT_RECEIVE|current status: %', h.status USING ERRCODE = 'P0001';
  END IF;

  SELECT branch_id, allow_negative_stock INTO v_from_branch, v_allow_neg FROM stores WHERE store_id = h.from_store_id;
  SELECT branch_id INTO v_to_branch FROM stores WHERE store_id = h.to_store_id;
  IF v_allow_neg IS NULL THEN v_allow_neg := false; END IF;

  FOR it IN
    SELECT * FROM stock_transfer_items
    WHERE stock_transfer_id = p_transfer_id
    ORDER BY id
    FOR UPDATE
  LOOP
    SELECT qty_on_hand, avg_cost INTO v_src_qty, v_src_avg
      FROM stock_balances
      WHERE store_id = h.from_store_id AND product_variant_id = it.product_variant_id
      FOR UPDATE;
    IF NOT FOUND THEN
      v_src_qty := 0;
      v_src_avg := 0;
    END IF;

    v_unit_cost := COALESCE(NULLIF(it.unit_cost, 0), NULLIF(v_src_avg, 0), 0);

    IF (v_src_qty - it.qty) < 0 AND NOT v_allow_neg THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK|%', it.product_variant_id USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO stock_balances (tenant_id, store_id, product_variant_id, qty_on_hand, qty_available, avg_cost, last_movement_at)
      VALUES (h.tenant_id, h.from_store_id, it.product_variant_id, -it.qty, -it.qty, v_src_avg, now())
    ON CONFLICT (store_id, product_variant_id) DO UPDATE
      SET qty_on_hand      = stock_balances.qty_on_hand - it.qty,
          qty_available    = (stock_balances.qty_on_hand - it.qty) - stock_balances.qty_reserved,
          last_movement_at = now(),
          updated_at       = now();

    INSERT INTO stock_balances (tenant_id, store_id, product_variant_id, qty_on_hand, qty_available, avg_cost, last_movement_at)
      VALUES (h.tenant_id, h.to_store_id, it.product_variant_id, it.qty, it.qty, v_unit_cost, now())
    ON CONFLICT (store_id, product_variant_id) DO UPDATE
      SET qty_on_hand   = stock_balances.qty_on_hand + it.qty,
          qty_available = (stock_balances.qty_on_hand + it.qty) - stock_balances.qty_reserved,
          avg_cost      = CASE
                            WHEN (stock_balances.qty_on_hand + it.qty) = 0 THEN stock_balances.avg_cost
                            ELSE (stock_balances.qty_on_hand * stock_balances.avg_cost + it.qty * v_unit_cost)
                                 / (stock_balances.qty_on_hand + it.qty)
                          END,
          last_movement_at = now(),
          updated_at       = now();

    INSERT INTO inventory_movements
      (auth_user_id, branch_id, store_id, product_variant_id, movement_type,
       reference_type, reference_id, qty_out, unit_cost, total_cost, movement_date, remarks, created_by)
      VALUES (h.tenant_id, v_from_branch, h.from_store_id, it.product_variant_id, 'transfer_out',
              'stock_transfer', p_transfer_id, it.qty, v_unit_cost, it.qty * v_unit_cost, now(), h.notes, h.received_by);

    INSERT INTO inventory_movements
      (auth_user_id, branch_id, store_id, product_variant_id, movement_type,
       reference_type, reference_id, qty_in, unit_cost, total_cost, movement_date, remarks, created_by)
      VALUES (h.tenant_id, v_to_branch, h.to_store_id, it.product_variant_id, 'transfer_in',
              'stock_transfer', p_transfer_id, it.qty, v_unit_cost, it.qty * v_unit_cost, now(), h.notes, h.received_by);

    v_count := v_count + 1;
  END LOOP;

  UPDATE stock_transfers
    SET status      = 'received',
        received_by = COALESCE(received_by, auth.uid()::text),
        received_at = now(),
        updated_at  = now()
    WHERE id = p_transfer_id;

  RETURN jsonb_build_object('transfer_id', p_transfer_id, 'status', 'received', 'items_applied', v_count);
END;
$$;

-- 6. Update convert_reorder_suggestions_to_requisition: read unit cost from price_list_items or stock_balances
CREATE OR REPLACE FUNCTION "convert_reorder_suggestions_to_requisition"(
  p_tenant uuid,
  p_suggestion_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_requisition uuid;
  v_count integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED|must be logged in' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_caller AND tenant_id = p_tenant) THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF p_suggestion_ids IS NULL OR array_length(p_suggestion_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'SUGGESTIONS_REQUIRED|no suggestions selected' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO purchase_requisitions
    (tenant_id, status, source, requested_by, notes, store_id, auth_user_id)
  SELECT p_tenant, 'submitted', 'reorder_engine', v_caller::text,
         'Generated from reorder suggestions', min(s.store_id::text)::uuid, p_tenant
  FROM reorder_suggestions s
  WHERE s.id = ANY(p_suggestion_ids) AND s.tenant_id = p_tenant AND s.status = 'open'
  HAVING count(*) > 0
  RETURNING id INTO v_requisition;

  IF v_requisition IS NULL THEN
    RAISE EXCEPTION 'SUGGESTIONS_NOT_OPEN|nothing to convert' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO purchase_requisition_items
    (requisition_id, product_variant_id, qty_requested, preferred_supplier_id, est_unit_cost, reason)
  SELECT v_requisition, s.product_variant_id, s.suggested_qty, s.preferred_supplier_id,
         COALESCE(cost_src.cost_price, 0), 'Reorder point reached'
  FROM reorder_suggestions s
  LEFT JOIN LATERAL (
    SELECT pli.cost_price 
    FROM price_list_items pli 
    WHERE pli.product_variant_id = s.product_variant_id AND pli.cost_price > 0 
    LIMIT 1
  ) cost_src ON true
  WHERE s.id = ANY(p_suggestion_ids) AND s.tenant_id = p_tenant AND s.status = 'open';

  UPDATE reorder_suggestions
    SET status = 'converted', converted_requisition_id = v_requisition, updated_at = now()
    WHERE id = ANY(p_suggestion_ids) AND tenant_id = p_tenant AND status = 'open';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('requisition_id', v_requisition, 'suggestions_converted', v_count);
END;
$$;

-- 7. Update inventory_reconcile: drop check against removed product_variants.stock_quantity
CREATE OR REPLACE FUNCTION public.inventory_reconcile(p_tenant uuid, p_store uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_vs_location jsonb;
  v_variant_cache jsonb := '[]'::jsonb;
  v_available jsonb;
  v_serials jsonb;
BEGIN
  -- 1. Invariant 1: Check stock_balances vs stock_by_location sum per (store_id, product_variant_id)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', b.store_id, 
      'product_variant_id', b.product_variant_id,
      'balance', b.qty_on_hand, 
      'location_sum', COALESCE(l.sum_qty, 0))), '[]'::jsonb)
  INTO v_balance_vs_location
  FROM stock_balances b
  LEFT JOIN (
    SELECT store_id, product_variant_id, SUM(qty_on_hand) AS sum_qty
    FROM stock_by_location
    WHERE tenant_id = p_tenant
      AND (p_store IS NULL OR store_id = p_store)
    GROUP BY store_id, product_variant_id
  ) l ON (l.store_id IS NOT DISTINCT FROM b.store_id) AND l.product_variant_id = b.product_variant_id
  WHERE b.tenant_id = p_tenant
    AND (p_store IS NULL OR b.store_id = p_store)
    AND b.qty_on_hand <> COALESCE(l.sum_qty, 0);

  -- 2. Invariant 2: Retired (stock is tracked natively via stock_balances)

  -- 3. Invariant 3: Check qty_available = qty_on_hand - qty_reserved
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', store_id, 
      'product_variant_id', product_variant_id,
      'qty_available', qty_available, 
      'expected', qty_on_hand - qty_reserved)), '[]'::jsonb)
  INTO v_available
  FROM stock_balances
  WHERE tenant_id = p_tenant
    AND (p_store IS NULL OR store_id = p_store)
    AND COALESCE(qty_available, 0) <> (qty_on_hand - qty_reserved);

  -- 4. Invariant 4: Check serials count for serial-tracked items
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', b.store_id, 
      'product_variant_id', b.product_variant_id,
      'on_hand', b.qty_on_hand, 
      'serials_in_stock', COALESCE(s.cnt, 0))), '[]'::jsonb)
  INTO v_serials
  FROM stock_balances b
  JOIN product_variants pv ON pv.id = b.product_variant_id
  JOIN products pr ON pr.id = pv.product_id AND pr.is_serial_tracked = true
  LEFT JOIN (
    SELECT store_id, product_variant_id, count(*) AS cnt
    FROM product_serials 
    WHERE tenant_id = p_tenant AND status = 'in_stock'
    GROUP BY store_id, product_variant_id
  ) s ON (s.store_id IS NOT DISTINCT FROM b.store_id) AND s.product_variant_id = b.product_variant_id
  WHERE b.tenant_id = p_tenant
    AND (p_store IS NULL OR b.store_id = p_store)
    AND b.qty_on_hand <> COALESCE(s.cnt, 0);

  -- Return reconciliation summary object
  RETURN jsonb_build_object(
    'clean', (v_balance_vs_location = '[]'::jsonb AND v_variant_cache = '[]'::jsonb
              AND v_available = '[]'::jsonb AND v_serials = '[]'::jsonb),
    'balance_vs_location', v_balance_vs_location,
    'variant_cache', v_variant_cache,
    'qty_available', v_available,
    'serial_counts', v_serials);
END;
$$;

-- 8. Drop legacy columns
ALTER TABLE "products" DROP COLUMN IF EXISTS "base_price";
ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "price";
ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "cost_price";
ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "stock_quantity";
ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "min_stock";

COMMIT;

NOTIFY pgrst, 'reload schema';
