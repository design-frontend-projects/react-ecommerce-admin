-- Migration: fix post_goods_receipt for 100% rejected or zero accepted items
-- Distinguishes between truly empty receipts vs receipts with rejected items
-- Corrects PO fulfillment: PO item received_quantity counts total physical items (accepted + rejected)
-- Updates PO status to received when all ordered quantities are accounted for

CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h                    goods_receipts%ROWTYPE;
  it                   goods_receipt_items%ROWTYPE;
  v_caller             uuid := auth.uid();
  v_type_id            uuid;
  v_txn_id             uuid := gen_random_uuid();
  v_txn_number         varchar;
  v_location           uuid;
  v_balance_id         uuid;
  v_qty                numeric;
  v_item_accounted_qty numeric;
  v_total_qty          numeric := 0;
  v_total_cost         numeric := 0;
  v_total_items        int := 0;
  v_total_received     numeric := 0;
  v_accepted_count     int := 0;
  v_open               int;
  v_po_total_received  numeric := 0;
  v_store_id           uuid := NULL;
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

  -- Check if receipt has any items and non-zero received quantity
  SELECT count(*), COALESCE(SUM(qty_received), 0)
    INTO v_total_items, v_total_received
    FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id;

  IF v_total_items = 0 THEN
    RAISE EXCEPTION 'RECEIPT_EMPTY|Goods receipt has no items' USING ERRCODE = 'P0001';
  END IF;

  IF v_total_received <= 0 THEN
    RAISE EXCEPTION 'RECEIPT_EMPTY|Goods receipt has no received quantities' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Find transaction type ID for PURCHASE_RECEIPT
  SELECT id INTO v_type_id FROM inventory_transaction_types WHERE code = 'PURCHASE_RECEIPT' LIMIT 1;
  IF v_type_id IS NULL THEN
    SELECT id INTO v_type_id FROM inventory_transaction_types WHERE direction = 'inbound' LIMIT 1;
  END IF;

  v_txn_number := 'INV-GR-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 4);

  -- 3. Calculate totals from items (for accepted quantities)
  FOR it IN
    SELECT * FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id
    ORDER BY created_at
  LOOP
    IF it.accepted_qty IS NOT NULL THEN
      v_qty := it.accepted_qty;
    ELSE
      v_qty := COALESCE(it.qty_received, 0);
    END IF;

    IF v_qty > 0 THEN
      v_total_qty := v_total_qty + v_qty;
      v_total_cost := v_total_cost + (v_qty * COALESCE(it.unit_cost, 0));
      v_accepted_count := v_accepted_count + 1;
    END IF;
  END LOOP;

  -- 4. Create the inventory_transactions header
  -- (Always records an audit trail transaction header for the receipt event)
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

  -- 5. Process each item: update PO items, stock balances, and transaction items
  FOR it IN
    SELECT * FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id
    ORDER BY created_at
  LOOP
    -- Calculate total physical quantity accounted for in this receipt item:
    -- accepted + rejected (or qty_received)
    v_item_accounted_qty := GREATEST(
      COALESCE(it.qty_received, 0),
      COALESCE(it.accepted_qty, 0) + COALESCE(it.rejected_qty, 0)
    );

    -- Update purchase_order_items received_quantity with total accounted units.
    -- This happens regardless of whether accepted qty is 0,
    -- so that delivered items (accepted or rejected) count toward fulfilling the PO item.
    IF it.purchase_order_item_id IS NOT NULL AND v_item_accounted_qty > 0 THEN
      UPDATE purchase_order_items
      SET received_quantity = COALESCE(received_quantity, 0) + v_item_accounted_qty,
          product_variant_id = COALESCE(product_variant_id, it.product_variant_id)
      WHERE id = it.purchase_order_item_id;
    END IF;

    -- For warehouse inventory, ONLY accepted quantities enter stock balances:
    IF it.accepted_qty IS NOT NULL THEN
      v_qty := it.accepted_qty;
    ELSE
      v_qty := COALESCE(it.qty_received, 0);
    END IF;

    -- If no items were accepted (100% rejected), skip stock balance update
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
    SELECT COALESCE(SUM(received_quantity), 0) INTO v_po_total_received
    FROM purchase_order_items
    WHERE po_id = h.purchase_order_id;

    SELECT count(*) INTO v_open
    FROM purchase_order_items
    WHERE po_id = h.purchase_order_id
      AND COALESCE(received_quantity, 0) < (quantity_ordered - COALESCE(cancelled_qty, 0));

    UPDATE purchase_orders
    SET lifecycle_status = CASE
          WHEN v_open = 0 THEN 'received'::po_lifecycle_status_enum
          WHEN v_po_total_received > 0 THEN 'partially_received'::po_lifecycle_status_enum
          ELSE lifecycle_status
        END,
        status = CASE
          WHEN v_open = 0 THEN 'received'
          WHEN v_po_total_received > 0 THEN 'partially_received'
          ELSE status
        END
    WHERE id = h.purchase_order_id
      AND COALESCE(lifecycle_status, 'draft') NOT IN ('closed', 'cancelled');
  END IF;

  RETURN jsonb_build_object(
    'goods_receipt_id', p_receipt_id,
    'status', 'posted',
    'items_posted', v_total_items,
    'items_accepted', v_accepted_count,
    'transaction_id', v_txn_id,
    'transaction_number', v_txn_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_goods_receipt(uuid) TO authenticated, service_role, anon;

-- Historical data fix: Recalculate PO item received_quantity and PO lifecycle
UPDATE purchase_order_items poi
SET received_quantity = sub.total_accounted
FROM (
  SELECT 
    gri.purchase_order_item_id,
    SUM(GREATEST(COALESCE(gri.qty_received, 0), COALESCE(gri.accepted_qty, 0) + COALESCE(gri.rejected_qty, 0))) as total_accounted
  FROM goods_receipt_items gri
  JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
  WHERE gri.purchase_order_item_id IS NOT NULL
    AND gr.status = 'posted'
  GROUP BY gri.purchase_order_item_id
) sub
WHERE poi.id = sub.purchase_order_item_id;

UPDATE purchase_orders po
SET lifecycle_status = CASE
      WHEN po_summary.open_items_count = 0 THEN 'received'::po_lifecycle_status_enum
      WHEN po_summary.total_received > 0 THEN 'partially_received'::po_lifecycle_status_enum
      ELSE po.lifecycle_status
    END,
    status = CASE
      WHEN po_summary.open_items_count = 0 THEN 'received'
      WHEN po_summary.total_received > 0 THEN 'partially_received'
      ELSE po.status
    END
FROM (
  SELECT 
    poi.po_id,
    COALESCE(SUM(poi.received_quantity), 0) as total_received,
    COUNT(*) FILTER (WHERE COALESCE(poi.received_quantity, 0) < (poi.quantity_ordered - COALESCE(poi.cancelled_qty, 0))) as open_items_count
  FROM purchase_order_items poi
  GROUP BY poi.po_id
) po_summary
WHERE po.id = po_summary.po_id
  AND COALESCE(po.lifecycle_status, 'draft') NOT IN ('closed', 'cancelled');

NOTIFY pgrst, 'reload schema';
