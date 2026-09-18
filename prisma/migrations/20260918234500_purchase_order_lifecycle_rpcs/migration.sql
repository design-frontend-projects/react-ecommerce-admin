-- =============================================================================
-- Migration: 20260918234500_purchase_order_lifecycle_rpcs
-- Description: Modern multi-tenant Purchase Order lifecycle RPC
--   - set_purchase_order_status: draft -> approved -> sent -> partially_received -> received -> closed (or cancelled)
-- =============================================================================

-- Ensure enum po_lifecycle_status_enum exists
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'po_lifecycle_status_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "po_lifecycle_status_enum" AS ENUM
      ('draft', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled');
  END IF;
END $do$;

-- 1. set_purchase_order_status
CREATE OR REPLACE FUNCTION public.set_purchase_order_status(
  p_po_id uuid,
  p_status po_lifecycle_status_enum
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po     purchase_orders%ROWTYPE;
  v_caller uuid := auth.uid();
  v_from   po_lifecycle_status_enum;
  v_ok     boolean;
BEGIN
  -- 1. Lock the purchase order record by ID
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO_NOT_FOUND|Purchase order % not found', p_po_id USING ERRCODE = 'P0001';
  END IF;

  v_from := COALESCE(v_po.lifecycle_status, 'draft');

  -- 2. Validate state machine transition
  v_ok := CASE
    WHEN p_status = v_from THEN true                                            -- idempotent no-op
    WHEN v_from = 'draft'              AND p_status IN ('approved', 'cancelled') THEN true
    WHEN v_from = 'approved'           AND p_status IN ('sent', 'cancelled') THEN true
    WHEN v_from = 'sent'               AND p_status IN ('partially_received', 'received', 'cancelled') THEN true
    WHEN v_from = 'partially_received' AND p_status IN ('received', 'closed', 'cancelled') THEN true
    WHEN v_from = 'received'           AND p_status IN ('closed', 'cancelled') THEN true
    ELSE false
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'PO_INVALID_TRANSITION|Cannot transition purchase order from % to %', v_from, p_status USING ERRCODE = 'P0001';
  END IF;

  -- 3. Apply updates
  UPDATE purchase_orders
    SET lifecycle_status = p_status,
        status           = p_status::text,
        approved_by      = CASE WHEN p_status = 'approved' THEN COALESCE(approved_by, v_caller::text) ELSE approved_by END,
        approved_at      = CASE WHEN p_status = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
        sent_at          = CASE WHEN p_status = 'sent' THEN COALESCE(sent_at, now()) ELSE sent_at END,
        closed_at        = CASE WHEN p_status = 'closed' THEN COALESCE(closed_at, now()) ELSE closed_at END
    WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'po_id', p_po_id,
    'from', v_from,
    'to', p_status
  );
END;
$$;

-- 2. Grant permissions to PostgREST roles
GRANT EXECUTE ON FUNCTION public.set_purchase_order_status(uuid, po_lifecycle_status_enum) TO authenticated, service_role, anon;

-- 3. post_goods_receipt: draft -> posted, updates stock_balances, records inventory_transactions, updates PO
CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h               goods_receipts%ROWTYPE;
  it              goods_receipt_items%ROWTYPE;
  v_caller        uuid := auth.uid();
  v_type_id       uuid;
  v_txn_id        uuid := gen_random_uuid();
  v_txn_number    varchar;
  v_location      uuid;
  v_balance_id    uuid;
  v_qty           numeric;
  v_total_qty     numeric := 0;
  v_total_cost    numeric := 0;
  v_count         int := 0;
  v_open          int;
  v_store_id      uuid := NULL;
BEGIN
  -- 1. Lock the receipt record
  SELECT * INTO h FROM goods_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECEIPT_NOT_FOUND|Goods receipt % not found', p_receipt_id USING ERRCODE = 'P0001';
  END IF;

  IF h.status <> 'draft' THEN
    RAISE EXCEPTION 'RECEIPT_ALREADY_POSTED|Goods receipt % is in status %', p_receipt_id, h.status USING ERRCODE = 'P0001';
  END IF;

  -- Validate store_id: ensure it actually exists in stores table
  IF h.store_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM stores WHERE store_id = h.store_id) THEN
      v_store_id := h.store_id;
    END IF;
  END IF;

  -- 2. Find transaction type ID for PURCHASE_RECEIPT
  SELECT id INTO v_type_id FROM inventory_transaction_types WHERE code = 'PURCHASE_RECEIPT' LIMIT 1;
  IF v_type_id IS NULL THEN
    SELECT id INTO v_type_id FROM inventory_transaction_types WHERE direction = 'inbound' LIMIT 1;
  END IF;

  v_txn_number := 'INV-GR-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 4);

  -- 3. Calculate totals from items
  FOR it IN
    SELECT * FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id
    ORDER BY created_at
  LOOP
    v_qty := COALESCE(it.accepted_qty, it.qty_received, 0);
    IF v_qty > 0 THEN
      v_total_qty := v_total_qty + v_qty;
      v_total_cost := v_total_cost + (v_qty * COALESCE(it.unit_cost, 0));
      v_count := v_count + 1;
    END IF;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'RECEIPT_EMPTY|Goods receipt has no accepted or receivable items' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Create the inventory_transactions header
  IF v_type_id IS NOT NULL THEN
    INSERT INTO inventory_transactions (
      id,
      tenant_id,
      transaction_number,
      type_id,
      status,
      direction,
      dest_warehouse_id,
      dest_store_id,
      reference_type,
      reference_id,
      total_qty,
      total_cost,
      posted_by,
      posted_at,
      created_at,
      updated_at
    ) VALUES (
      v_txn_id,
      h.tenant_id,
      v_txn_number,
      v_type_id,
      'posted',
      'inbound',
      h.warehouse_id,
      v_store_id,
      'goods_receipt',
      p_receipt_id,
      v_total_qty,
      v_total_cost,
      v_caller,
      now(),
      now(),
      now()
    );
  END IF;

  -- 5. Process each item: update stock balances and PO items
  FOR it IN
    SELECT * FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id
    ORDER BY created_at
  LOOP
    v_qty := COALESCE(it.accepted_qty, it.qty_received, 0);
    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    -- Resolve destination location
    v_location := it.warehouse_location_id;
    IF v_location IS NULL AND h.warehouse_id IS NOT NULL THEN
      SELECT id INTO v_location FROM warehouse_locations WHERE warehouse_id = h.warehouse_id AND is_default = true LIMIT 1;
      IF v_location IS NULL THEN
        SELECT id INTO v_location FROM warehouse_locations WHERE warehouse_id = h.warehouse_id LIMIT 1;
      END IF;
      IF v_location IS NULL THEN
        INSERT INTO warehouse_locations (tenant_id, warehouse_id, location_type, code, name, path, is_default)
        VALUES (h.tenant_id, h.warehouse_id, 'zone', 'DEFAULT', 'Default Location', '/DEFAULT', true)
        RETURNING id INTO v_location;
      END IF;
    END IF;

    -- Update or Insert stock_balances
    SELECT id INTO v_balance_id
      FROM stock_balances
      WHERE tenant_id = h.tenant_id
        AND product_variant_id = it.product_variant_id
        AND (warehouse_id = h.warehouse_id OR (warehouse_id IS NULL AND h.warehouse_id IS NULL))
        AND (store_id = v_store_id OR (store_id IS NULL AND v_store_id IS NULL))
        AND (location_id = v_location OR (location_id IS NULL AND v_location IS NULL))
        AND condition = it.condition
      LIMIT 1;

    IF v_balance_id IS NOT NULL THEN
      UPDATE stock_balances
      SET qty_on_hand = qty_on_hand + v_qty,
          qty_available = qty_available + v_qty,
          avg_cost = CASE WHEN (qty_on_hand + v_qty) > 0
                          THEN ((qty_on_hand * avg_cost) + (v_qty * COALESCE(it.unit_cost, 0))) / (qty_on_hand + v_qty)
                          ELSE avg_cost END,
          last_movement_at = now(),
          last_transaction_at = now(),
          last_transaction_id = v_txn_id,
          updated_at = now()
      WHERE id = v_balance_id;
    ELSE
      INSERT INTO stock_balances (
        tenant_id,
        warehouse_id,
        store_id,
        location_id,
        product_variant_id,
        condition,
        batch_id,
        serial_id,
        qty_on_hand,
        qty_available,
        qty_reserved,
        avg_cost,
        last_movement_at,
        last_transaction_at,
        last_transaction_id,
        created_at,
        updated_at
      ) VALUES (
        h.tenant_id,
        h.warehouse_id,
        v_store_id,
        v_location,
        it.product_variant_id,
        it.condition,
        it.batch_id,
        it.serial_id,
        v_qty,
        v_qty,
        0,
        COALESCE(it.unit_cost, 0),
        now(),
        now(),
        v_txn_id,
        now(),
        now()
      )
      RETURNING id INTO v_balance_id;
    END IF;

    -- Insert into inventory_transaction_items
    IF v_type_id IS NOT NULL THEN
      INSERT INTO inventory_transaction_items (
        id,
        tenant_id,
        transaction_id,
        product_variant_id,
        stock_balance_id,
        quantity,
        unit_cost,
        total_cost,
        dest_warehouse_id,
        dest_store_id,
        dest_location_id,
        condition,
        batch_id,
        serial_id,
        reference_item_type,
        reference_item_id,
        created_at
      ) VALUES (
        gen_random_uuid(),
        h.tenant_id,
        v_txn_id,
        it.product_variant_id,
        v_balance_id,
        v_qty,
        COALESCE(it.unit_cost, 0),
        v_qty * COALESCE(it.unit_cost, 0),
        h.warehouse_id,
        v_store_id,
        v_location,
        it.condition,
        it.batch_id,
        it.serial_id,
        'goods_receipt_item',
        it.id,
        now()
      );
    END IF;

    -- Update purchase_order_items received_quantity
    IF it.purchase_order_item_id IS NOT NULL THEN
      UPDATE purchase_order_items
      SET received_quantity = COALESCE(received_quantity, 0) + v_qty,
          product_variant_id = COALESCE(product_variant_id, it.product_variant_id)
      WHERE id = it.purchase_order_item_id;
    END IF;
  END LOOP;

  -- 6. Update receipt header to posted
  UPDATE goods_receipts
  SET status = 'posted',
      posted_by = COALESCE(posted_by, v_caller::text),
      posted_at = now(),
      updated_at = now()
  WHERE id = p_receipt_id;

  -- 7. Update purchase order lifecycle if linked
  IF h.purchase_order_id IS NOT NULL THEN
    SELECT count(*) INTO v_open
    FROM purchase_order_items
    WHERE po_id = h.purchase_order_id AND COALESCE(received_quantity, 0) < quantity_ordered;

    UPDATE purchase_orders
    SET lifecycle_status = CASE WHEN v_open = 0 THEN 'received'::po_lifecycle_status_enum ELSE 'partially_received'::po_lifecycle_status_enum END,
        status = CASE WHEN v_open = 0 THEN 'received' ELSE 'partially_received' END
    WHERE id = h.purchase_order_id
      AND COALESCE(lifecycle_status, 'draft') NOT IN ('closed', 'cancelled');
  END IF;

  RETURN jsonb_build_object(
    'goods_receipt_id', p_receipt_id,
    'status', 'posted',
    'items_posted', v_count,
    'transaction_id', v_txn_id,
    'transaction_number', v_txn_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_goods_receipt(uuid) TO authenticated, service_role, anon;

-- 4. Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

