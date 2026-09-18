-- =============================================================================
-- Migration: 20260917190000_sales_order_lifecycle_rpcs
-- Description: Modern multi-tenant Sales Order lifecycle RPCs:
--   - confirm_sales_order: draft -> confirmed (reserves stock)
--   - set_sales_order_status: confirmed -> picking -> packed -> completed
--   - cancel_sales_order: releases active reservations
--   - fulfill_sales_order: packed/confirmed -> delivered (outflow of stock)
--   - invoice_sales_order: delivered -> invoiced (generates sales_invoice)
-- =============================================================================

-- 1. confirm_sales_order
CREATE OR REPLACE FUNCTION public.confirm_sales_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h               sales_orders%ROWTYPE;
  it              sales_order_items%ROWTYPE;
  v_caller        uuid := auth.uid();
  v_effective_wh  uuid;
  v_allow_neg     boolean := false;
  v_bal_rec       record;
  v_available     numeric;
  v_count         integer := 0;
  v_sku           text;
BEGIN
  -- 1. Lock sales order
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;

  IF h.status <> 'draft' THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|Current status % is not draft', h.status USING ERRCODE = 'P0001';
  END IF;

  -- 2. Resolve effective warehouse
  v_effective_wh := h.warehouse_id;
  IF v_effective_wh IS NULL AND h.store_id IS NOT NULL THEN
    SELECT warehouse_id INTO v_effective_wh
    FROM store_warehouses
    WHERE store_id = h.store_id AND tenant_id = h.tenant_id AND is_active = true AND is_default = true
    LIMIT 1;

    IF v_effective_wh IS NULL THEN
      SELECT warehouse_id INTO v_effective_wh
      FROM store_warehouses
      WHERE store_id = h.store_id AND tenant_id = h.tenant_id AND is_active = true
      LIMIT 1;
    END IF;

    IF v_effective_wh IS NULL THEN
      SELECT id INTO v_effective_wh
      FROM warehouses
      WHERE store_id = h.store_id AND tenant_id = h.tenant_id AND is_default = true
      LIMIT 1;
    END IF;
  END IF;

  -- 3. Check allow_negative_stock
  IF v_effective_wh IS NOT NULL THEN
    SELECT allow_negative_stock INTO v_allow_neg
    FROM warehouses
    WHERE id = v_effective_wh;
  ELSIF h.store_id IS NOT NULL THEN
    SELECT allow_negative_stock INTO v_allow_neg
    FROM stores
    WHERE store_id = h.store_id;
  END IF;
  v_allow_neg := COALESCE(v_allow_neg, false);

  -- 4. Process each line item
  FOR it IN
    SELECT * FROM sales_order_items
    WHERE sales_order_id = p_order_id
    ORDER BY line_no, product_variant_id
    FOR UPDATE
  LOOP
    -- Fetch or lock stock_balance
    SELECT * INTO v_bal_rec
    FROM stock_balances
    WHERE tenant_id = h.tenant_id
      AND product_variant_id = it.product_variant_id
      AND (
        (v_effective_wh IS NOT NULL AND warehouse_id = v_effective_wh)
        OR (v_effective_wh IS NULL AND h.store_id IS NOT NULL AND store_id = h.store_id)
      )
    FOR UPDATE
    LIMIT 1;

    IF FOUND THEN
      v_available := COALESCE(v_bal_rec.qty_available, v_bal_rec.qty_on_hand - v_bal_rec.qty_reserved);
    ELSE
      v_available := 0;
    END IF;

    -- Validate stock availability
    IF (v_available < it.qty_ordered) AND NOT v_allow_neg THEN
      SELECT sku INTO v_sku FROM product_variants WHERE id = it.product_variant_id;
      RAISE EXCEPTION 'INSUFFICIENT_STOCK|Insufficient stock for variant % (available: %, requested: %)',
        COALESCE(v_sku, it.product_variant_id::text), v_available, it.qty_ordered
        USING ERRCODE = 'P0001';
    END IF;

    -- Update or insert stock_balances
    IF v_bal_rec.id IS NOT NULL THEN
      UPDATE stock_balances
      SET qty_reserved = qty_reserved + it.qty_ordered,
          qty_available = qty_on_hand - (qty_reserved + it.qty_ordered),
          last_movement_at = now(),
          updated_at = now()
      WHERE id = v_bal_rec.id;
    ELSE
      INSERT INTO stock_balances
        (tenant_id, warehouse_id, store_id, product_variant_id, condition, qty_on_hand, qty_reserved, qty_available, avg_cost, last_movement_at, created_at, updated_at)
      VALUES
        (h.tenant_id, v_effective_wh, h.store_id, it.product_variant_id, 'good'::stock_condition_enum, 0, it.qty_ordered, -it.qty_ordered, 0, now(), now(), now());
    END IF;

    -- Insert active reservation
    INSERT INTO stock_reservations
      (tenant_id, warehouse_id, store_id, product_variant_id, batch_id, qty, qty_consumed, status,
       reference_type, reference_id, reference_item_id, created_by, created_at, updated_at)
    VALUES
      (h.tenant_id, v_effective_wh, h.store_id, it.product_variant_id, it.batch_id, it.qty_ordered, 0,
       'active'::stock_reservation_status_enum, 'sales_order', p_order_id, it.id,
       COALESCE(v_caller::text, h.created_by), now(), now());

    -- Insert audit trail movement
    INSERT INTO inventory_movements
      (tenant_id, branch_id, store_id, warehouse_id, product_variant_id, batch_id,
       movement_type, status, condition, quantity_delta, unit_cost, total_cost,
       reference_type, reference_id, occurred_at, movement_date, remarks, created_by, created_at)
    VALUES
      (h.tenant_id, h.branch_id, h.store_id, v_effective_wh, it.product_variant_id, it.batch_id,
       'reserved'::movement_type_enum, 'posted'::movement_status_enum, 'good'::stock_condition_enum,
       0, COALESCE(it.unit_cost, 0), 0,
       'sales_order', p_order_id, now(), now(),
       'Reservation for ' || h.order_number, COALESCE(v_caller::text, h.created_by), now());

    -- Update order item reserved qty
    UPDATE sales_order_items
    SET qty_reserved = it.qty_ordered
    WHERE id = it.id;

    v_count := v_count + 1;
  END LOOP;

  -- 5. Update sales order status
  UPDATE sales_orders
  SET status = 'confirmed'::sales_order_status_enum,
      warehouse_id = COALESCE(warehouse_id, v_effective_wh),
      confirmed_by = COALESCE(confirmed_by, v_caller::text, h.created_by),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'confirmed',
    'items_reserved', v_count
  );
END;
$$;

-- 2. set_sales_order_status
CREATE OR REPLACE FUNCTION public.set_sales_order_status(p_order_id uuid, p_status sales_order_status_enum)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h        sales_orders%ROWTYPE;
  v_ok     boolean;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;

  v_ok := CASE
    WHEN p_status = h.status THEN true
    WHEN h.status = 'confirmed' AND p_status = 'picking' THEN true
    WHEN h.status = 'picking'   AND p_status = 'packed' THEN true
    WHEN h.status = 'invoiced'  AND p_status = 'completed' THEN true
    WHEN h.status = 'delivered' AND p_status = 'completed' THEN true
    ELSE false
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|Cannot transition from % to %', h.status, p_status USING ERRCODE = 'P0001';
  END IF;

  UPDATE sales_orders SET status = p_status, updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('order_id', p_order_id, 'status', p_status);
END;
$$;

-- 3. cancel_sales_order
CREATE OR REPLACE FUNCTION public.cancel_sales_order(p_order_id uuid)
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
  v_qty_to_release numeric;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;
  IF h.status IN ('delivered', 'invoiced', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|Cannot cancel order with status %', h.status USING ERRCODE = 'P0001';
  END IF;

  FOR r IN
    SELECT * FROM stock_reservations
    WHERE reference_type = 'sales_order' AND reference_id = p_order_id AND status = 'active'
    ORDER BY product_variant_id
    FOR UPDATE
  LOOP
    v_qty_to_release := r.qty - r.qty_consumed;
    IF v_qty_to_release > 0 THEN
      -- Revert stock_balances reservation
      UPDATE stock_balances
      SET qty_reserved = GREATEST(qty_reserved - v_qty_to_release, 0),
          qty_available = (qty_on_hand - GREATEST(qty_reserved - v_qty_to_release, 0)),
          last_movement_at = now(),
          updated_at = now()
      WHERE tenant_id = h.tenant_id
        AND product_variant_id = r.product_variant_id
        AND (
          (r.warehouse_id IS NOT NULL AND warehouse_id = r.warehouse_id)
          OR (r.warehouse_id IS NULL AND r.store_id IS NOT NULL AND store_id = r.store_id)
        );

      -- Log movement
      INSERT INTO inventory_movements
        (tenant_id, branch_id, store_id, warehouse_id, product_variant_id, batch_id,
         movement_type, status, condition, quantity_delta, unit_cost, total_cost,
         reference_type, reference_id, occurred_at, movement_date, remarks, created_by, created_at)
      VALUES
        (h.tenant_id, h.branch_id, r.store_id, r.warehouse_id, r.product_variant_id, r.batch_id,
         'released'::movement_type_enum, 'posted'::movement_status_enum, 'good'::stock_condition_enum,
         0, 0, 0,
         'sales_order', p_order_id, now(), now(),
         'Cancellation of ' || h.order_number, COALESCE(v_caller::text, h.created_by), now());
    END IF;

    UPDATE stock_reservations
    SET status = 'released'::stock_reservation_status_enum,
        released_at = now(),
        updated_at = now()
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE sales_order_items SET qty_reserved = 0 WHERE sales_order_id = p_order_id;
  UPDATE sales_orders SET status = 'cancelled'::sales_order_status_enum, updated_at = now() WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'cancelled', 'reservations_released', v_count);
END;
$$;

-- 4. fulfill_sales_order
CREATE OR REPLACE FUNCTION public.fulfill_sales_order(p_order_id uuid, p_lines jsonb DEFAULT NULL)
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
  v_count    int := 0;
  v_remaining numeric;
  v_all_done boolean;
  v_effective_wh uuid;
  v_unit_cost numeric;
BEGIN
  SELECT * INTO h FROM sales_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND|%', p_order_id USING ERRCODE = 'P0001';
  END IF;
  IF h.status NOT IN ('confirmed', 'picking', 'packed', 'delivered') THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|Cannot fulfill order with status %', h.status USING ERRCODE = 'P0001';
  END IF;

  v_effective_wh := h.warehouse_id;

  FOR it IN
    SELECT * FROM sales_order_items WHERE sales_order_id = p_order_id ORDER BY line_no, product_variant_id FOR UPDATE
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

    -- Fetch current avg_cost from stock_balances
    SELECT avg_cost INTO v_unit_cost
    FROM stock_balances
    WHERE tenant_id = h.tenant_id
      AND product_variant_id = it.product_variant_id
      AND (
        (v_effective_wh IS NOT NULL AND warehouse_id = v_effective_wh)
        OR (v_effective_wh IS NULL AND h.store_id IS NOT NULL AND store_id = h.store_id)
      )
    LIMIT 1;
    v_unit_cost := COALESCE(it.unit_cost, v_unit_cost, 0);

    -- Reduce on-hand and reserved
    UPDATE stock_balances
    SET qty_on_hand   = qty_on_hand - v_qty,
        qty_reserved  = GREATEST(qty_reserved - v_qty, 0),
        qty_available = (qty_on_hand - v_qty) - GREATEST(qty_reserved - v_qty, 0),
        last_movement_at = now(),
        updated_at       = now()
    WHERE tenant_id = h.tenant_id
      AND product_variant_id = it.product_variant_id
      AND (
        (v_effective_wh IS NOT NULL AND warehouse_id = v_effective_wh)
        OR (v_effective_wh IS NULL AND h.store_id IS NOT NULL AND store_id = h.store_id)
      );

    -- Log physical inventory movement
    INSERT INTO inventory_movements
      (tenant_id, branch_id, store_id, warehouse_id, product_variant_id, batch_id,
       movement_type, status, condition, quantity_delta, unit_cost, total_cost,
       reference_type, reference_id, occurred_at, movement_date, remarks, created_by, created_at)
    VALUES
      (h.tenant_id, h.branch_id, h.store_id, v_effective_wh, it.product_variant_id, it.batch_id,
       'sale'::movement_type_enum, 'posted'::movement_status_enum, 'good'::stock_condition_enum,
       -v_qty, v_unit_cost, v_qty * v_unit_cost,
       'sales_order', p_order_id, now(), now(),
       'Fulfilment for ' || h.order_number, COALESCE(v_caller::text, h.created_by), now());

    -- Update order item
    UPDATE sales_order_items
      SET qty_fulfilled = qty_fulfilled + v_qty,
          qty_reserved  = GREATEST(qty_reserved - v_qty, 0)
      WHERE id = it.id;

    -- Update stock reservation to consumed
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

-- 5. invoice_sales_order
CREATE OR REPLACE FUNCTION public.invoice_sales_order(p_order_id uuid)
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
  IF h.status <> 'delivered' THEN
    RAISE EXCEPTION 'ORDER_INVALID_TRANSITION|Cannot invoice order with status %', h.status USING ERRCODE = 'P0001';
  END IF;
  IF h.sales_invoice_id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', p_order_id, 'sales_invoice_id', h.sales_invoice_id, 'replayed', true);
  END IF;

  v_branch := COALESCE(h.branch_id, (SELECT branch_id FROM stores WHERE store_id = h.store_id));
  IF v_branch IS NULL THEN
    SELECT id INTO v_branch FROM branches WHERE tenant_id = h.tenant_id LIMIT 1;
  END IF;
  IF v_branch IS NULL THEN
    RAISE EXCEPTION 'ORDER_BRANCH_MISSING|Tenant has no branch configured' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO sales_invoices
    (tenant_id, branch_id, store_id, customer_id, invoice_no, invoice_date, status,
     subtotal, discount_value, discount_amount, tax_amount, rounding_amount, total_amount, paid_amount, due_amount,
     notes, created_by, created_at, updated_at)
  VALUES
    (h.tenant_id, v_branch, h.store_id, h.customer_id,
     'INV-' || h.order_number, now(), 'posted'::invoice_status_enum,
     h.subtotal, 0, h.discount_amount, h.tax_amount, 0, h.total_amount, 0, h.total_amount,
     'Invoice for sales order ' || h.order_number, COALESCE(v_caller::text, h.created_by), now(), now())
  RETURNING id INTO v_invoice;

  INSERT INTO sales_invoice_items
    (invoice_id, tenant_id, product_variant_id, line_no, quantity, unit_price,
     discount_value, discount_amount, tax_amount, line_subtotal, line_total, unit_cost, returned_quantity, batch_id, created_at)
  SELECT
    v_invoice, h.tenant_id, i.product_variant_id,
    row_number() OVER (ORDER BY i.created_at),
    i.qty_fulfilled, i.unit_price,
    0, i.discount_amount, i.tax_amount,
    i.qty_fulfilled * i.unit_price,
    i.line_total,
    COALESCE(i.unit_cost, 0),
    0,
    i.batch_id,
    now()
  FROM sales_order_items i
  WHERE i.sales_order_id = p_order_id AND i.qty_fulfilled > 0;

  UPDATE sales_orders
    SET status = 'invoiced'::sales_order_status_enum,
        sales_invoice_id = v_invoice,
        updated_at = now()
    WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'sales_invoice_id', v_invoice, 'status', 'invoiced');
END;
$$;

-- 6. Grants
GRANT EXECUTE ON FUNCTION public.confirm_sales_order(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.set_sales_order_status(uuid, sales_order_status_enum) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.cancel_sales_order(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fulfill_sales_order(uuid, jsonb) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.invoice_sales_order(uuid) TO authenticated, service_role, anon;

-- 7. PostgREST cache reload
NOTIFY pgrst, 'reload schema';
