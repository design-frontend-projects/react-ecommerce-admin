BEGIN;

-- =============================================================================
-- Document RPCs, rebuilt on the movement engine (20260713100000).
--   * apply_stock_adjustment  — same contract (+ optional movement-type
--     override for cycle counts); mutation now delegated to the primitive.
--   * apply_stock_transfer    — same contract; both legs share a group id.
--   * adjust_stock_balance    — NEW (was called by stock-balances UI but never
--     existed in any environment); single-line set/offset adjustment.
--   * receive_purchase_order_items — NEW (same situation; spec 009 contract);
--     creates+posts a goods_receipts document and drives the PO lifecycle.
-- =============================================================================

-- ── apply_stock_adjustment ───────────────────────────────────────────────────
-- DROP first: adding the optional override param would otherwise create an
-- ambiguous overload beside the old 1-arg function.
DROP FUNCTION IF EXISTS "apply_stock_adjustment"(uuid);

CREATE FUNCTION "apply_stock_adjustment"(
  p_adjustment_id uuid,
  p_movement_type_override text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h         stock_adjustments%ROWTYPE;
  it        stock_adjustment_items%ROWTYPE;
  v_branch  uuid;
  v_caller  uuid := auth.uid();
  v_delta   numeric;
  v_mtype   movement_type_enum;
  v_result  jsonb;
  v_count   int := 0;
BEGIN
  SELECT * INTO h FROM stock_adjustments WHERE id = p_adjustment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADJUSTMENT_NOT_FOUND|%', p_adjustment_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status IN ('approved', 'cancelled') THEN
    RAISE EXCEPTION 'ADJUSTMENT_ALREADY_APPLIED|%', h.status USING ERRCODE = 'P0001';
  END IF;

  v_branch := (SELECT branch_id FROM stores WHERE store_id = h.store_id);
  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'ADJUSTMENT_BRANCH_MISSING|store has no branch' USING ERRCODE = 'P0001';
  END IF;

  FOR it IN
    SELECT * FROM stock_adjustment_items
    WHERE stock_adjustment_id = p_adjustment_id
    ORDER BY product_variant_id
  LOOP
    v_delta := it.qty_adjusted;               -- captured (qty_after - qty_before) delta
    IF v_delta = 0 THEN
      CONTINUE;                               -- no-op line, skip ledger noise
    END IF;

    v_mtype := CASE
                 WHEN p_movement_type_override IS NOT NULL AND v_delta >= 0
                   THEN (p_movement_type_override || '_in')::movement_type_enum
                 WHEN p_movement_type_override IS NOT NULL
                   THEN (p_movement_type_override || '_out')::movement_type_enum
                 WHEN h.type = 'damage' AND it.reason = 'expired' THEN 'expired'::movement_type_enum
                 WHEN h.type = 'damage'                            THEN 'damage'::movement_type_enum
                 WHEN v_delta >= 0                                 THEN 'adjustment_in'::movement_type_enum
                 ELSE 'adjustment_out'::movement_type_enum
               END;

    -- FR-005: the engine applies the DELTA to the CURRENT live balance;
    -- FR-006: outflow cost is priced at avg_cost by the engine.
    v_result := post_inventory_movement(jsonb_build_object(
      'tenant_id', h.tenant_id,
      'branch_id', v_branch,
      'store_id', h.store_id,
      'product_variant_id', it.product_variant_id,
      'movement_type', v_mtype,
      'qty', abs(v_delta),
      'unit_cost', it.unit_cost,
      'batch_id', it.batch_id,
      'reference_type', 'stock_adjustment',
      'reference_id', p_adjustment_id,
      'source_document_type', 'stock_adjustment',
      'source_document_id', p_adjustment_id,
      'idempotency_key', 'adj:' || p_adjustment_id || ':' || it.id,
      'remarks', COALESCE(it.reason::text, h.notes),
      'reason_code', it.reason::text,
      'created_by', COALESCE(h.approved_by, v_caller::text)
    ));

    -- Persist reconciled reality onto the item (audit-honest for stocktakes)
    UPDATE stock_adjustment_items
      SET qty_before   = (v_result->>'qty_before')::numeric,
          qty_after    = (v_result->>'qty_after')::numeric,
          qty_adjusted = v_delta
      WHERE id = it.id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE stock_adjustments
    SET status      = 'approved',
        approved_by = COALESCE(approved_by, v_caller::text),
        approved_at = now(),
        updated_at  = now()
    WHERE id = p_adjustment_id;

  RETURN jsonb_build_object('adjustment_id', p_adjustment_id, 'status', 'approved', 'items_applied', v_count);
END;
$$;

-- ── apply_stock_transfer ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "apply_stock_transfer"(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h             stock_transfers%ROWTYPE;
  it            stock_transfer_items%ROWTYPE;
  v_from_branch uuid;
  v_to_branch   uuid;
  v_caller      uuid := auth.uid();
  v_group       uuid := gen_random_uuid();
  v_out         jsonb;
  v_unit_cost   numeric;
  v_count       int := 0;
BEGIN
  SELECT * INTO h FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_NOT_FOUND|%', p_transfer_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'TRANSFER_ALREADY_APPLIED|%', h.status USING ERRCODE = 'P0001';
  END IF;
  IF h.from_store_id = h.to_store_id THEN
    RAISE EXCEPTION 'TRANSFER_SAME_STORE|%', h.from_store_id USING ERRCODE = 'P0001';
  END IF;

  v_from_branch := COALESCE(h.from_branch_id, (SELECT branch_id FROM stores WHERE store_id = h.from_store_id));
  v_to_branch   := COALESCE(h.to_branch_id,   (SELECT branch_id FROM stores WHERE store_id = h.to_store_id));
  IF v_from_branch IS NULL OR v_to_branch IS NULL THEN
    RAISE EXCEPTION 'TRANSFER_BRANCH_MISSING|source or destination store has no branch' USING ERRCODE = 'P0001';
  END IF;

  FOR it IN
    SELECT * FROM stock_transfer_items
    WHERE stock_transfer_id = p_transfer_id
    ORDER BY product_variant_id
  LOOP
    IF it.qty IS NULL OR it.qty <= 0 THEN
      CONTINUE;
    END IF;

    -- OUT leg: engine prices the outflow at the source avg_cost
    v_out := post_inventory_movement(jsonb_build_object(
      'tenant_id', h.tenant_id,
      'branch_id', v_from_branch,
      'store_id', h.from_store_id,
      'product_variant_id', it.product_variant_id,
      'movement_type', 'transfer_out',
      'qty', it.qty,
      'unit_cost', it.unit_cost,
      'batch_id', it.batch_id,
      'reference_type', 'stock_transfer',
      'reference_id', p_transfer_id,
      'source_document_type', 'stock_transfer',
      'source_document_id', p_transfer_id,
      'dest_store_id', h.to_store_id,
      'movement_group_id', v_group,
      'idempotency_key', 'xfer-out:' || p_transfer_id || ':' || it.id,
      'remarks', h.notes,
      'created_by', COALESCE(h.received_by, v_caller::text)
    ));

    -- IN leg priced at explicit item cost, else the cost the OUT leg moved at
    v_unit_cost := COALESCE(NULLIF(it.unit_cost, 0),
                            NULLIF((SELECT unit_cost FROM inventory_movements WHERE id = (v_out->>'movement_id')::uuid), 0),
                            0);

    PERFORM post_inventory_movement(jsonb_build_object(
      'tenant_id', h.tenant_id,
      'branch_id', v_to_branch,
      'store_id', h.to_store_id,
      'product_variant_id', it.product_variant_id,
      'movement_type', 'transfer_in',
      'qty', it.qty,
      'unit_cost', v_unit_cost,
      'batch_id', it.batch_id,
      'reference_type', 'stock_transfer',
      'reference_id', p_transfer_id,
      'source_document_type', 'stock_transfer',
      'source_document_id', p_transfer_id,
      'movement_group_id', v_group,
      'idempotency_key', 'xfer-in:' || p_transfer_id || ':' || it.id,
      'remarks', h.notes,
      'created_by', COALESCE(h.received_by, v_caller::text)
    ));

    v_count := v_count + 1;
  END LOOP;

  UPDATE stock_transfers
    SET status      = 'received',
        received_by = COALESCE(received_by, v_caller::text),
        received_at = now(),
        updated_at  = now()
    WHERE id = p_transfer_id;

  RETURN jsonb_build_object('transfer_id', p_transfer_id, 'status', 'received', 'items_applied', v_count, 'movement_group_id', v_group);
END;
$$;

-- ── adjust_stock_balance (single-line manual adjustment; stock-balances UI) ──
CREATE OR REPLACE FUNCTION "adjust_stock_balance"(
  p_store_id uuid,
  p_product_variant_id uuid,
  p_adjustment_type text,
  p_quantity numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant  uuid;
  v_current numeric;
  v_delta   numeric;
BEGIN
  v_tenant := COALESCE(
    auth.uid(),
    (SELECT tenant_id FROM stock_balances WHERE store_id = p_store_id AND product_variant_id = p_product_variant_id),
    (SELECT auth_user_id FROM stores WHERE store_id = p_store_id));
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'TENANT_UNRESOLVED|no tenant for store %', p_store_id USING ERRCODE = 'P0001';
  END IF;
  IF p_adjustment_type NOT IN ('set', 'offset') THEN
    RAISE EXCEPTION 'ADJUSTMENT_TYPE_INVALID|%', p_adjustment_type USING ERRCODE = 'P0001';
  END IF;

  SELECT qty_on_hand INTO v_current
    FROM stock_balances
    WHERE store_id = p_store_id AND product_variant_id = p_product_variant_id;
  v_current := COALESCE(v_current, 0);

  v_delta := CASE WHEN p_adjustment_type = 'set' THEN p_quantity - v_current ELSE p_quantity END;
  IF v_delta = 0 THEN
    RETURN jsonb_build_object('skipped', true, 'qty_on_hand', v_current);
  END IF;

  RETURN post_inventory_movement(jsonb_build_object(
    'tenant_id', v_tenant,
    'store_id', p_store_id,
    'product_variant_id', p_product_variant_id,
    'movement_type', CASE WHEN v_delta > 0 THEN 'adjustment_in' ELSE 'adjustment_out' END,
    'qty', abs(v_delta),
    'reference_type', 'manual_adjustment',
    'remarks', p_reason,
    'reason_code', 'manual',
    'created_by', auth.uid()::text
  ));
END;
$$;

-- ── receive_purchase_order_items (spec 009 contract) ─────────────────────────
-- Creates and immediately posts a goods_receipts document, moves stock through
-- the engine, accumulates purchase_order_items.received_quantity and drives
-- the PO lifecycle (partially_received / received).
CREATE OR REPLACE FUNCTION "receive_purchase_order_items"(
  p_po_id integer,
  p_store_id uuid,
  p_received_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po        purchase_orders%ROWTYPE;
  v_tenant    uuid;
  v_caller    uuid := auth.uid();
  v_receipt   uuid;
  v_location  uuid;
  v_warehouse uuid;
  v_item      jsonb;
  v_po_item   int;
  v_variant   uuid;
  v_qty       numeric;
  v_cost      numeric;
  v_gr_item   uuid;
  v_count     int := 0;
  v_open      int;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'RECEIVE_STORE_REQUIRED|store_id is required' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_typeof(p_received_items) <> 'array' OR jsonb_array_length(p_received_items) = 0 THEN
    RAISE EXCEPTION 'RECEIVE_ITEMS_REQUIRED|no items to receive' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_po FROM purchase_orders WHERE po_id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO_NOT_FOUND|%', p_po_id USING ERRCODE = 'P0001';
  END IF;
  IF v_po.lifecycle_status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'PO_NOT_RECEIVABLE|%', v_po.lifecycle_status USING ERRCODE = 'P0001';
  END IF;

  v_tenant := COALESCE(v_po.auth_user_id, v_caller, (SELECT auth_user_id FROM stores WHERE store_id = p_store_id));
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'TENANT_UNRESOLVED|PO % has no tenant', p_po_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> v_tenant THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;

  v_location  := ensure_default_location(p_store_id, v_tenant);
  v_warehouse := (SELECT warehouse_id FROM warehouse_locations WHERE id = v_location);

  INSERT INTO goods_receipts
    (tenant_id, purchase_order_id, supplier_id, store_id, warehouse_id,
     status, received_date, notes, created_by, posted_by, posted_at, auth_user_id)
  VALUES
    (v_tenant, p_po_id, v_po.supplier_id, p_store_id, v_warehouse,
     'posted', now(), 'Received via PO receiving', v_caller::text, v_caller::text, now(), v_tenant)
  RETURNING id INTO v_receipt;

  FOR v_item IN SELECT e FROM jsonb_array_elements(p_received_items) AS e
                ORDER BY e->>'variant_id'
  LOOP
    v_po_item := (v_item->>'po_item_id')::int;
    v_variant := (v_item->>'variant_id')::uuid;
    v_qty     := (v_item->>'qty_to_receive')::numeric;
    v_cost    := COALESCE((v_item->>'unit_cost')::numeric, 0);

    IF v_variant IS NULL THEN
      RAISE EXCEPTION 'RECEIVE_VARIANT_REQUIRED|po_item %', v_po_item USING ERRCODE = 'P0001';
    END IF;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO goods_receipt_items
      (goods_receipt_id, purchase_order_item_id, product_variant_id, qty_received,
       unit_cost, warehouse_location_id,
       batch_id, batch_number, expiry_date, serial_numbers)
    VALUES
      (v_receipt, v_po_item, v_variant, v_qty, v_cost, v_location,
       (v_item->>'batch_id')::uuid, v_item->>'batch_number', (v_item->>'expiry_date')::date,
       CASE WHEN v_item ? 'serial_numbers' THEN v_item->'serial_numbers' ELSE NULL END)
    RETURNING id INTO v_gr_item;

    PERFORM post_inventory_movement(jsonb_build_object(
      'tenant_id', v_tenant,
      'store_id', p_store_id,
      'product_variant_id', v_variant,
      'movement_type', 'purchase',
      'qty', v_qty,
      'unit_cost', v_cost,
      'warehouse_location_id', v_location,
      'batch_id', (v_item->>'batch_id')::uuid,
      'batch_number', v_item->>'batch_number',
      'expiry_date', v_item->>'expiry_date',
      'serial_numbers', CASE WHEN v_item ? 'serial_numbers' THEN v_item->'serial_numbers' ELSE NULL END,
      'reference_type', 'goods_receipt',
      'reference_id', v_receipt,
      'source_document_type', 'goods_receipt',
      'source_document_id', v_receipt,
      'idempotency_key', 'gr:' || v_receipt || ':' || v_gr_item,
      'remarks', 'PO #' || p_po_id,
      'created_by', v_caller::text
    ));

    IF v_po_item IS NOT NULL THEN
      UPDATE purchase_order_items
        SET received_quantity  = COALESCE(received_quantity, 0) + v_qty,
            product_variant_id = COALESCE(product_variant_id, v_variant)
        WHERE po_item_id = v_po_item AND po_id = p_po_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- drive the PO lifecycle from remaining open quantities
  SELECT count(*) INTO v_open
    FROM purchase_order_items
    WHERE po_id = p_po_id AND COALESCE(received_quantity, 0) < quantity_ordered;

  UPDATE purchase_orders
    SET lifecycle_status = CASE WHEN v_open = 0 THEN 'received'::po_lifecycle_status_enum
                                ELSE 'partially_received'::po_lifecycle_status_enum END
    WHERE po_id = p_po_id;

  RETURN jsonb_build_object(
    'goods_receipt_id', v_receipt, 'po_id', p_po_id,
    'items_received', v_count,
    'po_status', CASE WHEN v_open = 0 THEN 'received' ELSE 'partially_received' END);
END;
$$;

COMMIT;
