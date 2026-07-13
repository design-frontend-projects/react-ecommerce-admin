BEGIN;

-- =============================================================================
-- Sales order lifecycle RPCs.
--   confirm_sales_order          draft -> confirmed  (reserves stock)
--   set_sales_order_status       confirmed -> picking -> packed (simple steps)
--   fulfill_sales_order          packed/confirmed -> delivered (partial ok;
--                                converts reservations to physical outflow)
--   invoice_sales_order          delivered -> invoiced (creates sales_invoice
--                                with engine COGS) -> completed on payment
--   cancel_sales_order           releases active reservations
--   release_expired_reservations maintenance sweep
-- POS keeps selling direct — reservations only serve the order-to-fulfil flow.
-- =============================================================================

CREATE OR REPLACE FUNCTION "confirm_sales_order"(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h        sales_orders%ROWTYPE;
  it       sales_order_items%ROWTYPE;
  v_caller uuid := auth.uid();
  v_count  int := 0;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'draft' THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|%|confirmed', h.status USING ERRCODE = 'P0001';
  END IF;

  FOR it IN
    SELECT * FROM sales_order_items WHERE sales_order_id = p_order_id ORDER BY product_variant_id
  LOOP
    -- guard on qty_available happens inside the engine ('reserved' movement)
    PERFORM post_inventory_movement(jsonb_build_object(
      'tenant_id', h.tenant_id,
      'store_id', h.store_id,
      'product_variant_id', it.product_variant_id,
      'movement_type', 'reserved',
      'qty', it.qty_ordered,
      'batch_id', it.batch_id,
      'reference_type', 'sales_order',
      'reference_id', p_order_id,
      'source_document_type', 'sales_order',
      'source_document_id', p_order_id,
      'idempotency_key', 'so-reserve:' || p_order_id || ':' || it.id,
      'remarks', 'Reservation for ' || h.order_number,
      'created_by', v_caller::text
    ));

    INSERT INTO stock_reservations
      (tenant_id, store_id, product_variant_id, batch_id, qty, status,
       reference_type, reference_id, reference_item_id, created_by, auth_user_id)
    VALUES
      (h.tenant_id, h.store_id, it.product_variant_id, it.batch_id, it.qty_ordered, 'active',
       'sales_order', p_order_id, it.id, v_caller::text, h.tenant_id);

    UPDATE sales_order_items SET qty_reserved = it.qty_ordered WHERE id = it.id;
    v_count := v_count + 1;
  END LOOP;

  UPDATE sales_orders
    SET status = 'confirmed',
        confirmed_by = COALESCE(confirmed_by, v_caller::text),
        confirmed_at = now(),
        updated_at = now()
    WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'confirmed', 'items_reserved', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION "set_sales_order_status"(p_order_id uuid, p_status sales_order_status_enum)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h        sales_orders%ROWTYPE;
  v_caller uuid := auth.uid();
  v_ok     boolean;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- only the simple warehouse steps; confirm/fulfil/invoice/cancel have their
  -- own RPCs with side effects
  v_ok := CASE
    WHEN p_status = h.status THEN true
    WHEN h.status = 'confirmed' AND p_status = 'picking' THEN true
    WHEN h.status = 'picking'   AND p_status = 'packed' THEN true
    WHEN h.status = 'invoiced'  AND p_status = 'completed' THEN true
    ELSE false
  END;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|%|%', h.status, p_status USING ERRCODE = 'P0001';
  END IF;

  UPDATE sales_orders SET status = p_status, updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('order_id', p_order_id, 'status', p_status);
END;
$$;

-- p_lines: [{item_id, qty}] — omit for full fulfilment of remaining qty
CREATE OR REPLACE FUNCTION "fulfill_sales_order"(p_order_id uuid, p_lines jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h          sales_orders%ROWTYPE;
  it         sales_order_items%ROWTYPE;
  v_caller   uuid := auth.uid();
  v_qty      numeric;
  v_line     jsonb;
  v_count    int := 0;
  v_remaining numeric;
  v_all_done boolean;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status NOT IN ('confirmed', 'picking', 'packed', 'delivered') THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|%|delivered', h.status USING ERRCODE = 'P0001';
  END IF;

  FOR it IN
    SELECT * FROM sales_order_items WHERE sales_order_id = p_order_id ORDER BY product_variant_id
  LOOP
    v_remaining := it.qty_ordered - it.qty_fulfilled;
    IF v_remaining <= 0 THEN
      CONTINUE;
    END IF;

    IF p_lines IS NULL THEN
      v_qty := v_remaining;
    ELSE
      SELECT (e->>'qty')::numeric INTO v_qty
        FROM jsonb_array_elements(p_lines) e
        WHERE (e->>'item_id')::uuid = it.id;
      IF v_qty IS NULL OR v_qty <= 0 THEN
        CONTINUE;
      END IF;
      v_qty := LEAST(v_qty, v_remaining);
    END IF;

    -- reservation -> physical outflow (decrements qty_reserved AND qty_on_hand)
    PERFORM post_inventory_movement(jsonb_build_object(
      'tenant_id', h.tenant_id,
      'store_id', h.store_id,
      'product_variant_id', it.product_variant_id,
      'movement_type', 'reservation_conversion',
      'qty', v_qty,
      'batch_id', it.batch_id,
      'reference_type', 'sales_order',
      'reference_id', p_order_id,
      'source_document_type', 'sales_order',
      'source_document_id', p_order_id,
      'idempotency_key', 'so-fulfil:' || p_order_id || ':' || it.id || ':' || (it.qty_fulfilled + v_qty),
      'remarks', 'Fulfilment ' || h.order_number,
      'created_by', v_caller::text
    ));

    UPDATE sales_order_items
      SET qty_fulfilled = qty_fulfilled + v_qty,
          qty_reserved  = GREATEST(qty_reserved - v_qty, 0)
      WHERE id = it.id;

    UPDATE stock_reservations
      SET qty_consumed = LEAST(qty, qty_consumed + v_qty),
          status = CASE WHEN qty_consumed + v_qty >= qty THEN 'consumed'::stock_reservation_status_enum ELSE status END,
          consumed_at = CASE WHEN qty_consumed + v_qty >= qty THEN now() ELSE consumed_at END,
          updated_at = now()
      WHERE reference_type = 'sales_order' AND reference_item_id = it.id AND status = 'active';

    v_count := v_count + 1;
  END LOOP;

  SELECT bool_and(qty_fulfilled >= qty_ordered) INTO v_all_done
    FROM sales_order_items WHERE sales_order_id = p_order_id;

  UPDATE sales_orders
    SET status = CASE WHEN COALESCE(v_all_done, false) THEN 'delivered'::sales_order_status_enum ELSE status END,
        updated_at = now()
    WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'lines_fulfilled', v_count, 'fully_delivered', COALESCE(v_all_done, false));
END;
$$;

CREATE OR REPLACE FUNCTION "invoice_sales_order"(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h          sales_orders%ROWTYPE;
  v_caller   uuid := auth.uid();
  v_branch   uuid;
  v_invoice  uuid;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'delivered' THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|%|invoiced', h.status USING ERRCODE = 'P0001';
  END IF;
  IF h.sales_invoice_id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', p_order_id, 'sales_invoice_id', h.sales_invoice_id, 'replayed', true);
  END IF;

  v_branch := COALESCE(h.branch_id, (SELECT branch_id FROM stores WHERE store_id = h.store_id));
  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'ORDER_BRANCH_MISSING|store has no branch' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO sales_invoices
    (auth_user_id, branch_id, store_id, customer_id, invoice_no, invoice_date, status,
     subtotal, discount_amount, tax_amount, total_amount, due_amount, notes, created_by)
  VALUES
    (h.tenant_id, v_branch, h.store_id, h.customer_id,
     'INV-' || h.order_number, now(), 'posted',
     h.subtotal, h.discount_amount, h.tax_amount, h.total_amount, h.total_amount,
     'Invoice for sales order ' || h.order_number, v_caller::text)
  RETURNING id INTO v_invoice;

  -- COGS per line = the cost the engine actually moved at (fulfilment ledger)
  INSERT INTO sales_invoice_items
    (invoice_id, product_variant_id, line_no, quantity, unit_price,
     discount_amount, tax_amount, line_subtotal, line_total, unit_cost, batch_id, auth_user_id)
  SELECT v_invoice, i.product_variant_id,
         row_number() OVER (ORDER BY i.created_at),
         i.qty_fulfilled, i.unit_price, i.discount_amount, i.tax_amount,
         i.qty_fulfilled * i.unit_price,
         i.line_total,
         COALESCE((
           SELECT SUM(m.unit_cost * m.qty_out) / NULLIF(SUM(m.qty_out), 0)
           FROM inventory_movements m
           WHERE m.reference_type = 'sales_order' AND m.reference_id = p_order_id
             AND m.product_variant_id = i.product_variant_id
             AND m.movement_type = 'reservation_conversion'
         ), 0),
         i.batch_id, h.tenant_id
  FROM sales_order_items i
  WHERE i.sales_order_id = p_order_id AND i.qty_fulfilled > 0;

  UPDATE sales_orders
    SET status = 'invoiced', sales_invoice_id = v_invoice, updated_at = now()
    WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'sales_invoice_id', v_invoice, 'status', 'invoiced');
END;
$$;

CREATE OR REPLACE FUNCTION "cancel_sales_order"(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h        sales_orders%ROWTYPE;
  r        stock_reservations%ROWTYPE;
  v_caller uuid := auth.uid();
  v_count  int := 0;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status IN ('delivered', 'invoiced', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|%|cancelled', h.status USING ERRCODE = 'P0001';
  END IF;

  FOR r IN
    SELECT * FROM stock_reservations
    WHERE reference_type = 'sales_order' AND reference_id = p_order_id AND status = 'active'
    ORDER BY product_variant_id
  LOOP
    PERFORM post_inventory_movement(jsonb_build_object(
      'tenant_id', h.tenant_id,
      'store_id', r.store_id,
      'product_variant_id', r.product_variant_id,
      'movement_type', 'released',
      'qty', r.qty - r.qty_consumed,
      'batch_id', r.batch_id,
      'reference_type', 'sales_order',
      'reference_id', p_order_id,
      'idempotency_key', 'so-release:' || p_order_id || ':' || r.id,
      'remarks', 'Cancellation of ' || h.order_number,
      'created_by', v_caller::text
    ));

    UPDATE stock_reservations
      SET status = 'released', released_at = now(), updated_at = now()
      WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  UPDATE sales_order_items SET qty_reserved = 0 WHERE sales_order_id = p_order_id;
  UPDATE sales_orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'cancelled', 'reservations_released', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION "release_expired_reservations"(p_tenant uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r        stock_reservations%ROWTYPE;
  v_caller uuid := auth.uid();
  v_count  int := 0;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_tenant THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;

  FOR r IN
    SELECT * FROM stock_reservations
    WHERE tenant_id = p_tenant AND status = 'active'
      AND expires_at IS NOT NULL AND expires_at < now()
    ORDER BY store_id, product_variant_id
    FOR UPDATE
  LOOP
    PERFORM post_inventory_movement(jsonb_build_object(
      'tenant_id', p_tenant,
      'store_id', r.store_id,
      'product_variant_id', r.product_variant_id,
      'movement_type', 'released',
      'qty', r.qty - r.qty_consumed,
      'batch_id', r.batch_id,
      'reference_type', r.reference_type,
      'reference_id', r.reference_id,
      'idempotency_key', 'res-expire:' || r.id,
      'remarks', 'Reservation expired',
      'created_by', 'system'
    ));
    UPDATE stock_reservations
      SET status = 'expired', released_at = now(), updated_at = now()
      WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('released', v_count);
END;
$$;

COMMIT;
