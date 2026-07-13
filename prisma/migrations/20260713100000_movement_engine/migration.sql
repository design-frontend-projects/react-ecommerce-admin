BEGIN;

-- =============================================================================
-- MOVEMENT ENGINE — the single owner of ALL stock mutation.
--
--   post_inventory_movement(p jsonb)  -> jsonb   (the primitive)
--   apply_inventory_movements(p jsonb, group)    (batch wrapper, deadlock-safe)
--   resync_variant_stock(variant)                (denormalized cache)
--   ensure_default_location(store, tenant)       (auto-provision warehouse)
--   inventory_reconcile(tenant, store)           (invariant violation report)
--
-- Invariants maintained:
--   1. SUM(stock_by_location.qty_on_hand) per (store,variant) == stock_balances.qty_on_hand
--   2. batch-level location sums == batch on-hand
--   3. serial count (in_stock per store/variant) == on-hand for serial-tracked
--   4. product_variants.stock_quantity == round(SUM(stock_balances.qty_on_hand))
--   5. qty_available == qty_on_hand - qty_reserved
--
-- No application code may write stock_balances / stock_by_location /
-- product_variants.stock_quantity directly.
-- =============================================================================

-- ── resync the denormalized variant cache ────────────────────────────────────
CREATE OR REPLACE FUNCTION "resync_variant_stock"(p_variant_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE product_variants
    SET stock_quantity = COALESCE(
          (SELECT round(SUM(qty_on_hand)) FROM stock_balances WHERE product_variant_id = p_variant_id), 0)
    WHERE id = p_variant_id;
$$;

-- ── auto-provision a default warehouse + zone for a store ────────────────────
CREATE OR REPLACE FUNCTION "ensure_default_location"(p_store_id uuid, p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location uuid;
  v_warehouse uuid;
BEGIN
  v_location := get_default_location(p_store_id);
  IF v_location IS NOT NULL THEN
    RETURN v_location;
  END IF;

  SELECT id INTO v_warehouse FROM warehouses WHERE store_id = p_store_id AND is_default = true LIMIT 1;
  IF v_warehouse IS NULL THEN
    INSERT INTO warehouses (tenant_id, branch_id, store_id, code, name, is_default, auth_user_id)
    SELECT p_tenant_id, s.branch_id, s.store_id,
           'WH-' || left(s.store_id::text, 8),
           COALESCE(s.name, 'Warehouse') || ' (Default)', true, p_tenant_id
    FROM stores s WHERE s.store_id = p_store_id
    RETURNING id INTO v_warehouse;
  END IF;
  IF v_warehouse IS NULL THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND|%', p_store_id USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO warehouse_locations (tenant_id, warehouse_id, location_type, code, name, path, is_default, auth_user_id)
  VALUES (p_tenant_id, v_warehouse, 'zone', 'DEFAULT', 'Default Zone', '/DEFAULT', true, p_tenant_id)
  ON CONFLICT DO NOTHING;

  RETURN get_default_location(p_store_id);
END;
$$;

-- ── the primitive ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "post_inventory_movement"(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant       uuid  := (p->>'tenant_id')::uuid;
  v_store        uuid  := (p->>'store_id')::uuid;
  v_variant      uuid  := (p->>'product_variant_id')::uuid;
  v_mtype        movement_type_enum := (p->>'movement_type')::movement_type_enum;
  v_qty          numeric := (p->>'qty')::numeric;
  v_branch       uuid  := (p->>'branch_id')::uuid;
  v_location     uuid  := (p->>'warehouse_location_id')::uuid;
  v_batch        uuid  := (p->>'batch_id')::uuid;
  v_batch_number text  := p->>'batch_number';
  v_expiry       date  := (p->>'expiry_date')::date;
  v_serials      jsonb := COALESCE(p->'serial_numbers', 'null'::jsonb);
  v_idem         text  := p->>'idempotency_key';
  v_unit_cost_in numeric := COALESCE((p->>'unit_cost')::numeric, 0);
  v_move_date    timestamptz := COALESCE((p->>'movement_date')::timestamptz, now());
  v_caller       uuid  := auth.uid();

  v_warehouse    uuid;
  v_is_batch     boolean;
  v_is_serial    boolean;
  v_batch_status batch_status_enum;
  v_direction    int;           -- +1 in, -1 out, 0 reserve-only
  v_reserved_delta numeric := 0;
  v_onhand_delta numeric := 0;
  v_bal_qty      numeric;
  v_bal_reserved numeric;
  v_bal_avg      numeric;
  v_new_qty      numeric;
  v_new_reserved numeric;
  v_new_avg      numeric;
  v_unit_cost    numeric;
  v_allow_neg    boolean;
  v_movement_id  uuid;
  v_existing     record;
  v_serial       text;
  v_serial_id    uuid;
  v_serial_count int;
  v_new_serial_status serial_status_enum;
BEGIN
  -- basic validation
  IF v_tenant IS NULL OR v_store IS NULL OR v_variant IS NULL OR v_mtype IS NULL THEN
    RAISE EXCEPTION 'MOVEMENT_INVALID_INPUT|tenant_id, store_id, product_variant_id, movement_type are required' USING ERRCODE = 'P0001';
  END IF;
  IF v_qty IS NULL OR v_qty <= 0 THEN
    RAISE EXCEPTION 'MOVEMENT_INVALID_QTY|qty must be > 0' USING ERRCODE = 'P0001';
  END IF;
  -- tenant enforcement: a JWT caller may only post into their own tenant
  IF v_caller IS NOT NULL AND v_caller <> v_tenant THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- idempotent replay
  IF v_idem IS NOT NULL THEN
    SELECT id, qty_before, qty_after INTO v_existing
      FROM inventory_movements
      WHERE auth_user_id = v_tenant AND idempotency_key = v_idem;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'movement_id', v_existing.id, 'replayed', true,
        'qty_before', v_existing.qty_before, 'qty_after', v_existing.qty_after);
    END IF;
  END IF;

  IF v_branch IS NULL THEN
    SELECT branch_id INTO v_branch FROM stores WHERE store_id = v_store;
  END IF;
  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'MOVEMENT_BRANCH_MISSING|store has no branch' USING ERRCODE = 'P0001';
  END IF;

  -- direction
  v_direction := CASE
    WHEN v_mtype IN ('opening_stock','purchase','sale_return','transfer_in','adjustment_in',
                     'production_output','found','cycle_count_in') THEN 1
    WHEN v_mtype IN ('sale','purchase_return','transfer_out','adjustment_out','damage','expired',
                     'lost','cycle_count_out','production_consumption') THEN -1
    WHEN v_mtype IN ('reserved','released','reservation_conversion') THEN 0
    ELSE NULL
  END;
  IF v_direction IS NULL THEN
    RAISE EXCEPTION 'MOVEMENT_TYPE_UNSUPPORTED|%', v_mtype USING ERRCODE = 'P0001';
  END IF;

  CASE v_mtype
    WHEN 'reserved'               THEN v_reserved_delta :=  v_qty; v_onhand_delta := 0;
    WHEN 'released'               THEN v_reserved_delta := -v_qty; v_onhand_delta := 0;
    WHEN 'reservation_conversion' THEN v_reserved_delta := -v_qty; v_onhand_delta := -v_qty;
    ELSE v_onhand_delta := v_direction * v_qty;
  END CASE;

  -- tracking flags
  SELECT COALESCE(pr.is_batch_tracked, false), COALESCE(pr.is_serial_tracked, false)
    INTO v_is_batch, v_is_serial
  FROM product_variants pv JOIN products pr ON pr.product_id = pv.product_id
  WHERE pv.id = v_variant;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VARIANT_NOT_FOUND|%', v_variant USING ERRCODE = 'P0001';
  END IF;

  -- batch enforcement (physical movements only)
  IF v_is_batch AND v_onhand_delta <> 0 THEN
    IF v_batch IS NULL AND v_batch_number IS NOT NULL AND v_onhand_delta > 0 THEN
      INSERT INTO product_batches (tenant_id, product_variant_id, batch_number, expiry_date, unit_cost,
                                   received_reference_type, received_reference_id, auth_user_id)
      VALUES (v_tenant, v_variant, v_batch_number, v_expiry, v_unit_cost_in,
              p->>'source_document_type', (p->>'source_document_id')::uuid, v_tenant)
      ON CONFLICT (tenant_id, product_variant_id, batch_number) DO UPDATE SET updated_at = now()
      RETURNING id INTO v_batch;
    END IF;
    IF v_batch IS NULL THEN
      RAISE EXCEPTION 'BATCH_REQUIRED|%', v_variant USING ERRCODE = 'P0001';
    END IF;
    SELECT status INTO v_batch_status FROM product_batches WHERE id = v_batch AND tenant_id = v_tenant;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'BATCH_NOT_FOUND|%', v_batch USING ERRCODE = 'P0001';
    END IF;
    IF v_onhand_delta < 0 AND v_batch_status IN ('blocked','expired') THEN
      RAISE EXCEPTION 'BATCH_BLOCKED|%', v_batch_status USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- serial enforcement (physical movements only)
  IF v_is_serial AND v_onhand_delta <> 0 THEN
    IF jsonb_typeof(v_serials) <> 'array' THEN
      RAISE EXCEPTION 'SERIALS_REQUIRED|%', v_variant USING ERRCODE = 'P0001';
    END IF;
    v_serial_count := jsonb_array_length(v_serials);
    IF v_serial_count <> abs(v_onhand_delta) OR v_qty <> trunc(v_qty) THEN
      RAISE EXCEPTION 'SERIAL_COUNT_MISMATCH|expected % got %', abs(v_onhand_delta), v_serial_count USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_allow_neg := inventory_allow_negative(v_tenant, v_store);

  -- lock order: stock_balances first, then stock_by_location
  SELECT qty_on_hand, qty_reserved, avg_cost INTO v_bal_qty, v_bal_reserved, v_bal_avg
    FROM stock_balances
    WHERE store_id = v_store AND product_variant_id = v_variant
    FOR UPDATE;
  IF NOT FOUND THEN
    v_bal_qty := 0; v_bal_reserved := 0; v_bal_avg := 0;
  END IF;

  v_new_qty      := v_bal_qty + v_onhand_delta;
  v_new_reserved := v_bal_reserved + v_reserved_delta;

  -- negative-stock / over-reservation guards
  IF v_mtype = 'sale' AND (v_bal_qty - v_bal_reserved - v_qty) < 0 AND NOT v_allow_neg THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK|%', v_variant USING ERRCODE = 'P0001';
  ELSIF v_mtype = 'reserved' AND (v_bal_qty - v_new_reserved) < 0 AND NOT v_allow_neg THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE|%', v_variant USING ERRCODE = 'P0001';
  ELSIF v_mtype IN ('released','reservation_conversion') AND v_new_reserved < 0 THEN
    RAISE EXCEPTION 'RESERVATION_UNDERFLOW|%', v_variant USING ERRCODE = 'P0001';
  ELSIF v_onhand_delta < 0 AND v_mtype <> 'sale' AND v_new_qty < 0 AND NOT v_allow_neg THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK|%', v_variant USING ERRCODE = 'P0001';
  END IF;

  -- costing: moving weighted average; outflow priced at current avg_cost
  IF v_onhand_delta > 0 THEN
    v_unit_cost := COALESCE(NULLIF(v_unit_cost_in, 0), NULLIF(v_bal_avg, 0), 0);
    v_new_avg := CASE
      WHEN v_new_qty > 0 THEN (GREATEST(v_bal_qty, 0) * v_bal_avg + v_onhand_delta * v_unit_cost) / (GREATEST(v_bal_qty, 0) + v_onhand_delta)
      ELSE v_bal_avg
    END;
  ELSIF v_onhand_delta < 0 THEN
    v_unit_cost := CASE WHEN v_bal_avg > 0 THEN v_bal_avg ELSE COALESCE(NULLIF(v_unit_cost_in, 0), 0) END;
    v_new_avg := v_bal_avg;
  ELSE
    v_unit_cost := 0;
    v_new_avg := v_bal_avg;
  END IF;

  INSERT INTO stock_balances (tenant_id, store_id, product_variant_id, qty_on_hand, qty_reserved, qty_available, avg_cost, last_movement_at, auth_user_id)
    VALUES (v_tenant, v_store, v_variant, v_new_qty, v_new_reserved, v_new_qty - v_new_reserved, v_new_avg, v_move_date, v_tenant)
  ON CONFLICT (store_id, product_variant_id) DO UPDATE
    SET qty_on_hand      = v_new_qty,
        qty_reserved     = v_new_reserved,
        qty_available    = v_new_qty - v_new_reserved,
        avg_cost         = v_new_avg,
        last_movement_at = v_move_date,
        updated_at       = now();

  -- bin-level stock (default location fallback; auto-provisions if missing)
  IF v_location IS NULL THEN
    v_location := ensure_default_location(v_store, v_tenant);
  END IF;
  SELECT warehouse_id INTO v_warehouse FROM warehouse_locations WHERE id = v_location;
  IF v_warehouse IS NULL THEN
    RAISE EXCEPTION 'LOCATION_NOT_FOUND|%', v_location USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO stock_by_location (tenant_id, store_id, warehouse_id, warehouse_location_id, product_variant_id, batch_id,
                                 qty_on_hand, qty_reserved, last_movement_at, auth_user_id)
    VALUES (v_tenant, v_store, v_warehouse, v_location, v_variant, v_batch,
            v_onhand_delta, v_reserved_delta, v_move_date, v_tenant)
  ON CONFLICT (warehouse_location_id, product_variant_id, COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO UPDATE
    SET qty_on_hand      = stock_by_location.qty_on_hand + v_onhand_delta,
        qty_reserved     = stock_by_location.qty_reserved + v_reserved_delta,
        last_movement_at = v_move_date,
        updated_at       = now();

  -- batch depletion bookkeeping
  IF v_batch IS NOT NULL THEN
    UPDATE product_batches pb SET
      status = CASE
        WHEN pb.status = 'active'
         AND (SELECT COALESCE(SUM(qty_on_hand), 0) FROM stock_by_location WHERE batch_id = pb.id) <= 0
        THEN 'depleted'::batch_status_enum
        WHEN pb.status = 'depleted'
         AND (SELECT COALESCE(SUM(qty_on_hand), 0) FROM stock_by_location WHERE batch_id = pb.id) > 0
        THEN 'active'::batch_status_enum
        ELSE pb.status END,
      updated_at = now()
    WHERE pb.id = v_batch;
  END IF;

  -- the immutable ledger row
  INSERT INTO inventory_movements
    (auth_user_id, branch_id, store_id, product_variant_id, movement_type,
     reference_type, reference_id, qty_in, qty_out, unit_cost, total_cost,
     movement_date, remarks, created_by,
     warehouse_id, warehouse_location_id, batch_id, qty_before, qty_after,
     source_document_type, source_document_id, dest_store_id, dest_warehouse_location_id,
     movement_group_id, idempotency_key, reason_code)
  VALUES
    (v_tenant, v_branch, v_store, v_variant, v_mtype,
     p->>'reference_type', (p->>'reference_id')::uuid,
     CASE WHEN v_onhand_delta > 0 THEN v_onhand_delta ELSE 0 END,
     CASE WHEN v_onhand_delta < 0 THEN -v_onhand_delta
          WHEN v_onhand_delta = 0 THEN v_qty ELSE 0 END,
     v_unit_cost, abs(CASE WHEN v_onhand_delta = 0 THEN 0 ELSE v_onhand_delta END) * v_unit_cost,
     v_move_date, p->>'remarks', COALESCE(p->>'created_by', v_caller::text),
     v_warehouse, v_location, v_batch, v_bal_qty, v_new_qty,
     p->>'source_document_type', (p->>'source_document_id')::uuid,
     (p->>'dest_store_id')::uuid, (p->>'dest_warehouse_location_id')::uuid,
     (p->>'movement_group_id')::uuid, v_idem, p->>'reason_code')
  RETURNING id INTO v_movement_id;

  -- serial materialization / transitions + movement links
  IF v_is_serial AND v_onhand_delta <> 0 AND jsonb_typeof(v_serials) = 'array' THEN
    FOR v_serial IN SELECT jsonb_array_elements_text(v_serials) LOOP
      IF v_onhand_delta > 0 THEN
        IF v_mtype IN ('sale_return', 'transfer_in') THEN
          -- serial should already exist: bring it back in stock at this store
          UPDATE product_serials
            SET status = 'in_stock', store_id = v_store, warehouse_location_id = v_location,
                last_reference_type = p->>'source_document_type',
                last_reference_id = (p->>'source_document_id')::uuid,
                updated_at = now()
            WHERE tenant_id = v_tenant AND product_variant_id = v_variant AND serial_number = v_serial
            RETURNING id INTO v_serial_id;
          IF v_serial_id IS NULL THEN
            INSERT INTO product_serials (tenant_id, product_variant_id, batch_id, serial_number, status,
                                         store_id, warehouse_location_id, unit_cost, received_at,
                                         received_reference_type, received_reference_id, auth_user_id)
            VALUES (v_tenant, v_variant, v_batch, v_serial, 'in_stock', v_store, v_location, v_unit_cost,
                    v_move_date, p->>'source_document_type', (p->>'source_document_id')::uuid, v_tenant)
            RETURNING id INTO v_serial_id;
          END IF;
        ELSE
          -- fresh intake: serial must not already be in stock
          IF EXISTS (SELECT 1 FROM product_serials
                     WHERE tenant_id = v_tenant AND product_variant_id = v_variant
                       AND serial_number = v_serial AND status = 'in_stock') THEN
            RAISE EXCEPTION 'SERIAL_EXISTS|%', v_serial USING ERRCODE = 'P0001';
          END IF;
          INSERT INTO product_serials (tenant_id, product_variant_id, batch_id, serial_number, status,
                                       store_id, warehouse_location_id, unit_cost, received_at,
                                       received_reference_type, received_reference_id, auth_user_id)
          VALUES (v_tenant, v_variant, v_batch, v_serial, 'in_stock', v_store, v_location, v_unit_cost,
                  v_move_date, p->>'source_document_type', (p->>'source_document_id')::uuid, v_tenant)
          ON CONFLICT (tenant_id, product_variant_id, serial_number) DO UPDATE
            SET status = 'in_stock', store_id = v_store, warehouse_location_id = v_location, updated_at = now()
          RETURNING id INTO v_serial_id;
        END IF;
      ELSE
        -- outflow: serial must be in stock at this store
        SELECT id INTO v_serial_id FROM product_serials
          WHERE tenant_id = v_tenant AND product_variant_id = v_variant
            AND serial_number = v_serial AND status = 'in_stock' AND store_id = v_store
          FOR UPDATE;
        IF v_serial_id IS NULL THEN
          RAISE EXCEPTION 'SERIAL_NOT_AVAILABLE|%', v_serial USING ERRCODE = 'P0001';
        END IF;
        v_new_serial_status := CASE v_mtype
          WHEN 'sale'                   THEN 'sold'::serial_status_enum
          WHEN 'reservation_conversion' THEN 'sold'::serial_status_enum
          WHEN 'transfer_out'           THEN 'in_transit'::serial_status_enum
          WHEN 'purchase_return'        THEN 'returned'::serial_status_enum
          WHEN 'damage'                 THEN 'damaged'::serial_status_enum
          ELSE 'written_off'::serial_status_enum
        END;
        UPDATE product_serials
          SET status = v_new_serial_status,
              sold_at = CASE WHEN v_new_serial_status = 'sold' THEN v_move_date ELSE sold_at END,
              store_id = CASE WHEN v_mtype = 'transfer_out' THEN COALESCE((p->>'dest_store_id')::uuid, store_id) ELSE store_id END,
              last_reference_type = p->>'source_document_type',
              last_reference_id = (p->>'source_document_id')::uuid,
              updated_at = now()
          WHERE id = v_serial_id;
      END IF;

      INSERT INTO inventory_movement_serials (movement_id, serial_id)
        VALUES (v_movement_id, v_serial_id)
      ON CONFLICT DO NOTHING;
      v_serial_id := NULL;
    END LOOP;
  END IF;

  PERFORM resync_variant_stock(v_variant);

  RETURN jsonb_build_object(
    'movement_id', v_movement_id, 'replayed', false,
    'qty_before', v_bal_qty, 'qty_after', v_new_qty,
    'avg_cost', v_new_avg, 'batch_id', v_batch,
    'warehouse_location_id', v_location);
END;
$$;

-- The primitive is engine-internal: browsers must go through document RPCs /
-- server fns (service role). SECURITY DEFINER functions calling it run as the
-- function owner, so this revoke does not affect them.
REVOKE EXECUTE ON FUNCTION "post_inventory_movement"(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION "ensure_default_location"(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "post_inventory_movement"(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION "ensure_default_location"(uuid, uuid) TO service_role;

-- ── batch wrapper: sorts lines to a fixed lock order, shares a group id ─────
CREATE OR REPLACE FUNCTION "apply_inventory_movements"(p_movements jsonb, p_group_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group uuid := COALESCE(p_group_id, gen_random_uuid());
  v_results jsonb := '[]'::jsonb;
  v_line jsonb;
BEGIN
  IF jsonb_typeof(p_movements) <> 'array' THEN
    RAISE EXCEPTION 'MOVEMENTS_INVALID|expected jsonb array' USING ERRCODE = 'P0001';
  END IF;

  FOR v_line IN
    SELECT e FROM jsonb_array_elements(p_movements) AS e
    ORDER BY e->>'store_id', e->>'product_variant_id'
  LOOP
    v_results := v_results || post_inventory_movement(v_line || jsonb_build_object('movement_group_id', v_group));
  END LOOP;

  RETURN jsonb_build_object('movement_group_id', v_group, 'movements', v_results);
END;
$$;

REVOKE EXECUTE ON FUNCTION "apply_inventory_movements"(jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "apply_inventory_movements"(jsonb, uuid) TO service_role;

-- ── reconciliation report (invariants 1–5) ───────────────────────────────────
CREATE OR REPLACE FUNCTION "inventory_reconcile"(p_tenant uuid, p_store uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_balance_vs_location jsonb;
  v_variant_cache jsonb;
  v_available jsonb;
  v_serials jsonb;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_tenant THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', b.store_id, 'product_variant_id', b.product_variant_id,
      'balance', b.qty_on_hand, 'location_sum', COALESCE(l.sum_qty, 0))), '[]'::jsonb)
  INTO v_balance_vs_location
  FROM stock_balances b
  LEFT JOIN (
    SELECT store_id, product_variant_id, SUM(qty_on_hand) AS sum_qty
    FROM stock_by_location GROUP BY store_id, product_variant_id
  ) l ON l.store_id = b.store_id AND l.product_variant_id = b.product_variant_id
  WHERE b.tenant_id = p_tenant
    AND (p_store IS NULL OR b.store_id = p_store)
    AND b.qty_on_hand <> COALESCE(l.sum_qty, 0);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'product_variant_id', pv.id, 'cache', pv.stock_quantity, 'actual', COALESCE(b.sum_qty, 0))), '[]'::jsonb)
  INTO v_variant_cache
  FROM product_variants pv
  LEFT JOIN (
    SELECT product_variant_id, round(SUM(qty_on_hand)) AS sum_qty
    FROM stock_balances WHERE tenant_id = p_tenant GROUP BY product_variant_id
  ) b ON b.product_variant_id = pv.id
  WHERE pv.auth_user_id = p_tenant
    AND COALESCE(pv.stock_quantity, 0) <> COALESCE(b.sum_qty, 0);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', store_id, 'product_variant_id', product_variant_id,
      'qty_available', qty_available, 'expected', qty_on_hand - qty_reserved)), '[]'::jsonb)
  INTO v_available
  FROM stock_balances
  WHERE tenant_id = p_tenant
    AND (p_store IS NULL OR store_id = p_store)
    AND COALESCE(qty_available, 0) <> (qty_on_hand - qty_reserved);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', b.store_id, 'product_variant_id', b.product_variant_id,
      'on_hand', b.qty_on_hand, 'serials_in_stock', COALESCE(s.cnt, 0))), '[]'::jsonb)
  INTO v_serials
  FROM stock_balances b
  JOIN product_variants pv ON pv.id = b.product_variant_id
  JOIN products pr ON pr.product_id = pv.product_id AND pr.is_serial_tracked = true
  LEFT JOIN (
    SELECT store_id, product_variant_id, count(*) AS cnt
    FROM product_serials WHERE tenant_id = p_tenant AND status = 'in_stock'
    GROUP BY store_id, product_variant_id
  ) s ON s.store_id = b.store_id AND s.product_variant_id = b.product_variant_id
  WHERE b.tenant_id = p_tenant
    AND (p_store IS NULL OR b.store_id = p_store)
    AND b.qty_on_hand <> COALESCE(s.cnt, 0);

  RETURN jsonb_build_object(
    'clean', (v_balance_vs_location = '[]'::jsonb AND v_variant_cache = '[]'::jsonb
              AND v_available = '[]'::jsonb AND v_serials = '[]'::jsonb),
    'balance_vs_location', v_balance_vs_location,
    'variant_cache', v_variant_cache,
    'qty_available', v_available,
    'serial_counts', v_serials);
END;
$$;

COMMIT;
