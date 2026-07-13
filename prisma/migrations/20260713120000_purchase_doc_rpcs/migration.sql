BEGIN;

-- =============================================================================
-- Purchase document RPCs.
--   set_purchase_order_status   — server-enforced PO state machine
--   post_goods_receipt          — posts a draft receipt through the engine
--   convert_requisition_to_po   — approved requisition -> draft PO(s)
-- =============================================================================

CREATE OR REPLACE FUNCTION "set_purchase_order_status"(
  p_po_id integer,
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
  SELECT * INTO v_po FROM purchase_orders WHERE po_id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO_NOT_FOUND|%', p_po_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_po.auth_user_id IS NOT NULL AND v_caller <> v_po.auth_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;

  v_from := COALESCE(v_po.lifecycle_status, 'draft');

  v_ok := CASE
    WHEN p_status = v_from THEN true                                   -- idempotent no-op
    WHEN v_from = 'draft'              AND p_status IN ('approved', 'cancelled') THEN true
    WHEN v_from = 'approved'           AND p_status IN ('sent', 'cancelled') THEN true
    WHEN v_from = 'sent'               AND p_status IN ('partially_received', 'received', 'cancelled') THEN true
    WHEN v_from = 'partially_received' AND p_status IN ('received', 'closed') THEN true
    WHEN v_from = 'received'           AND p_status = 'closed' THEN true
    ELSE false
  END;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'PO_INVALID_TRANSITION|%|%', v_from, p_status USING ERRCODE = 'P0001';
  END IF;

  UPDATE purchase_orders
    SET lifecycle_status = p_status,
        approved_by = CASE WHEN p_status = 'approved' THEN COALESCE(approved_by, v_caller::text) ELSE approved_by END,
        approved_at = CASE WHEN p_status = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
        sent_at     = CASE WHEN p_status = 'sent' THEN COALESCE(sent_at, now()) ELSE sent_at END,
        closed_at   = CASE WHEN p_status = 'closed' THEN COALESCE(closed_at, now()) ELSE closed_at END
    WHERE po_id = p_po_id;

  RETURN jsonb_build_object('po_id', p_po_id, 'from', v_from, 'to', p_status);
END;
$$;

-- ── post_goods_receipt: draft -> posted via the movement engine ──────────────
CREATE OR REPLACE FUNCTION "post_goods_receipt"(p_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h          goods_receipts%ROWTYPE;
  it         goods_receipt_items%ROWTYPE;
  v_caller   uuid := auth.uid();
  v_location uuid;
  v_count    int := 0;
  v_open     int;
BEGIN
  SELECT * INTO h FROM goods_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECEIPT_NOT_FOUND|%', p_receipt_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'draft' THEN
    RAISE EXCEPTION 'RECEIPT_ALREADY_POSTED|%', h.status USING ERRCODE = 'P0001';
  END IF;

  FOR it IN
    SELECT * FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id
    ORDER BY product_variant_id
  LOOP
    IF it.qty_received IS NULL OR it.qty_received <= 0 THEN
      CONTINUE;
    END IF;

    v_location := COALESCE(it.warehouse_location_id, ensure_default_location(h.store_id, h.tenant_id));

    PERFORM post_inventory_movement(jsonb_build_object(
      'tenant_id', h.tenant_id,
      'store_id', h.store_id,
      'product_variant_id', it.product_variant_id,
      'movement_type', 'purchase',
      'qty', it.qty_received,
      'unit_cost', it.unit_cost,
      'warehouse_location_id', v_location,
      'batch_id', it.batch_id,
      'batch_number', it.batch_number,
      'expiry_date', it.expiry_date,
      'serial_numbers', it.serial_numbers,
      'reference_type', 'goods_receipt',
      'reference_id', p_receipt_id,
      'source_document_type', 'goods_receipt',
      'source_document_id', p_receipt_id,
      'idempotency_key', 'gr:' || p_receipt_id || ':' || it.id,
      'remarks', COALESCE(h.notes, 'Goods receipt ' || h.receipt_number),
      'created_by', v_caller::text
    ));

    IF it.purchase_order_item_id IS NOT NULL THEN
      UPDATE purchase_order_items
        SET received_quantity  = COALESCE(received_quantity, 0) + it.qty_received,
            product_variant_id = COALESCE(product_variant_id, it.product_variant_id)
        WHERE po_item_id = it.purchase_order_item_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'RECEIPT_EMPTY|no receivable items' USING ERRCODE = 'P0001';
  END IF;

  UPDATE goods_receipts
    SET status = 'posted',
        posted_by = COALESCE(posted_by, v_caller::text),
        posted_at = now(),
        updated_at = now()
    WHERE id = p_receipt_id;

  -- drive the PO lifecycle when the receipt references a purchase order
  IF h.purchase_order_id IS NOT NULL THEN
    SELECT count(*) INTO v_open
      FROM purchase_order_items
      WHERE po_id = h.purchase_order_id AND COALESCE(received_quantity, 0) < quantity_ordered;
    UPDATE purchase_orders
      SET lifecycle_status = CASE WHEN v_open = 0 THEN 'received'::po_lifecycle_status_enum
                                  ELSE 'partially_received'::po_lifecycle_status_enum END
      WHERE po_id = h.purchase_order_id
        AND COALESCE(lifecycle_status, 'draft') NOT IN ('closed', 'cancelled');
  END IF;

  RETURN jsonb_build_object('goods_receipt_id', p_receipt_id, 'status', 'posted', 'items_posted', v_count);
END;
$$;

-- ── convert_requisition_to_po: approved -> draft POs grouped by supplier ─────
CREATE OR REPLACE FUNCTION "convert_requisition_to_po"(p_requisition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h          purchase_requisitions%ROWTYPE;
  v_caller   uuid := auth.uid();
  v_supplier record;
  v_po_id    int;
  v_pos      jsonb := '[]'::jsonb;
  v_first_po int;
BEGIN
  SELECT * INTO h FROM purchase_requisitions WHERE id = p_requisition_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUISITION_NOT_FOUND|%', p_requisition_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'approved' THEN
    RAISE EXCEPTION 'REQUISITION_NOT_APPROVED|%', h.status USING ERRCODE = 'P0001';
  END IF;

  -- one PO per (preferred) supplier; items without a supplier group together
  FOR v_supplier IN
    SELECT COALESCE(preferred_supplier_id, 0) AS supplier_key,
           preferred_supplier_id
    FROM purchase_requisition_items
    WHERE requisition_id = p_requisition_id
    GROUP BY COALESCE(preferred_supplier_id, 0), preferred_supplier_id
  LOOP
    IF v_supplier.preferred_supplier_id IS NULL THEN
      RAISE EXCEPTION 'REQUISITION_SUPPLIER_MISSING|assign a preferred supplier to every item before conversion' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO purchase_orders
      (supplier_id, order_date, status, lifecycle_status, total_amount,
       branch_id, store_id, notes, auth_user_id)
    SELECT v_supplier.preferred_supplier_id, now(), 'pending', 'draft',
           COALESCE(SUM(i.qty_requested * i.est_unit_cost), 0),
           h.branch_id, h.store_id,
           'From requisition ' || h.requisition_number, h.tenant_id
    FROM purchase_requisition_items i
    WHERE i.requisition_id = p_requisition_id
      AND i.preferred_supplier_id = v_supplier.preferred_supplier_id
    RETURNING po_id INTO v_po_id;

    INSERT INTO purchase_order_items
      (po_id, product_id, product_variant_id, quantity_ordered, unit_cost, subtotal, received_quantity, auth_user_id)
    SELECT v_po_id, pv.product_id, i.product_variant_id,
           ceil(i.qty_requested)::int, i.est_unit_cost,
           i.qty_requested * i.est_unit_cost, 0, h.tenant_id
    FROM purchase_requisition_items i
    JOIN product_variants pv ON pv.id = i.product_variant_id
    WHERE i.requisition_id = p_requisition_id
      AND i.preferred_supplier_id = v_supplier.preferred_supplier_id;

    v_first_po := COALESCE(v_first_po, v_po_id);
    v_pos := v_pos || to_jsonb(v_po_id);
  END LOOP;

  IF v_first_po IS NULL THEN
    RAISE EXCEPTION 'REQUISITION_EMPTY|no items to convert' USING ERRCODE = 'P0001';
  END IF;

  UPDATE purchase_requisitions
    SET status = 'converted',
        converted_purchase_order_id = v_first_po,
        updated_at = now()
    WHERE id = p_requisition_id;

  RETURN jsonb_build_object('requisition_id', p_requisition_id, 'purchase_order_ids', v_pos);
END;
$$;

COMMIT;
