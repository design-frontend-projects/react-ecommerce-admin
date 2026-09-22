-- =============================================================================
-- Migration: 20260923000000_rebuild_reorder_engine
-- Purpose: Normalized PostgreSQL functions for reorder check & suggestion conversion
--          aligned with multi-tenant UUID PK schema and PostgREST schema cache.
-- =============================================================================

DROP FUNCTION IF EXISTS public.run_reorder_check(uuid, uuid);
DROP FUNCTION IF EXISTS public.run_reorder_check(uuid);

CREATE OR REPLACE FUNCTION public.run_reorder_check(p_tenant uuid, p_store uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  r           record;
  v_available numeric;
  v_on_order  numeric;
  v_suggest   numeric;
  v_created   int := 0;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_tenant THEN
    IF NOT EXISTS (
      SELECT 1 FROM tenant_users WHERE (auth_user_id = v_caller OR user_id = v_caller) AND tenant_id = p_tenant
    ) AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = v_caller AND tenant_id = p_tenant
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  FOR r IN
    SELECT rr.*
    FROM reorder_rules rr
    WHERE rr.tenant_id = p_tenant AND rr.is_active = true
      AND (p_store IS NULL OR rr.store_id = p_store)
    ORDER BY rr.store_id, rr.product_variant_id
  LOOP
    -- Calculate available stock from stock_balances
    SELECT COALESCE(SUM(COALESCE(qty_available, qty_on_hand - qty_reserved)), 0)
      INTO v_available
      FROM stock_balances
      WHERE tenant_id = p_tenant
        AND product_variant_id = r.product_variant_id
        AND (
          (r.store_id IS NOT NULL AND store_id = r.store_id)
          OR (r.store_id IS NULL AND r.warehouse_id IS NOT NULL AND warehouse_id = r.warehouse_id)
          OR (r.store_id IS NULL AND r.warehouse_id IS NULL)
        );
    v_available := COALESCE(v_available, 0);

    -- Calculate on-order quantity from active purchase orders
    SELECT COALESCE(SUM(GREATEST(poi.quantity_ordered - COALESCE(poi.received_quantity, 0), 0)), 0)
      INTO v_on_order
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.po_id
      WHERE poi.tenant_id = p_tenant
        AND poi.product_variant_id = r.product_variant_id
        AND (
          (r.store_id IS NOT NULL AND (po.store_id = r.store_id OR po.store_id IS NULL))
          OR (r.store_id IS NULL AND r.warehouse_id IS NOT NULL AND (po.warehouse_id = r.warehouse_id OR po.warehouse_id IS NULL))
          OR (r.store_id IS NULL AND r.warehouse_id IS NULL)
        )
        AND COALESCE(po.lifecycle_status::text, 'draft') IN ('approved', 'sent', 'partially_received');
    v_on_order := COALESCE(v_on_order, 0);

    IF (v_available + v_on_order) <= (COALESCE(r.reorder_point, 0) + COALESCE(r.safety_stock, 0)) THEN
      v_suggest := COALESCE(
        r.reorder_qty,
        GREATEST(COALESCE(r.max_qty, 0) - v_available - v_on_order, COALESCE(r.eoq, 0), 0));
      
      IF v_suggest <= 0 THEN
        v_suggest := GREATEST((COALESCE(r.reorder_point, 0) + COALESCE(r.safety_stock, 0)) - (v_available + v_on_order) + 1, 1);
      END IF;

      INSERT INTO reorder_suggestions
        (tenant_id, reorder_rule_id, product_variant_id, store_id, warehouse_id,
         qty_available_at_run, qty_on_order_at_run, suggested_qty,
         preferred_supplier_id, status, run_at, created_by_user_id, updated_by_user_id)
      VALUES
        (p_tenant, r.id, r.product_variant_id, r.store_id, r.warehouse_id,
         v_available, v_on_order, v_suggest,
         r.preferred_supplier_id, 'open', now(), v_caller, v_caller)
      ON CONFLICT (reorder_rule_id) WHERE (status = 'open'::reorder_suggestion_status_enum) DO UPDATE
        SET qty_available_at_run = EXCLUDED.qty_available_at_run,
            qty_on_order_at_run  = EXCLUDED.qty_on_order_at_run,
            suggested_qty        = EXCLUDED.suggested_qty,
            run_at               = now(),
            updated_at           = now(),
            updated_by_user_id   = COALESCE(v_caller, reorder_suggestions.updated_by_user_id);
      v_created := v_created + 1;
    ELSE
      UPDATE reorder_suggestions
        SET status = 'expired', updated_at = now()
        WHERE reorder_rule_id = r.id AND status = 'open';
    END IF;
  END LOOP;

  RETURN jsonb_build_object('suggestions_open', v_created);
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_reorder_suggestions(p_tenant uuid, p_suggestion_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_requisition uuid;
  v_first_store uuid;
  v_branch_id   uuid;
  v_count       int := 0;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_tenant THEN
    IF NOT EXISTS (
      SELECT 1 FROM tenant_users WHERE (auth_user_id = v_caller OR user_id = v_caller) AND tenant_id = p_tenant
    ) AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = v_caller AND tenant_id = p_tenant
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_suggestion_ids IS NULL OR array_length(p_suggestion_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'SUGGESTIONS_REQUIRED|no suggestions selected' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.store_id, st.branch_id
    INTO v_first_store, v_branch_id
    FROM reorder_suggestions s
    LEFT JOIN stores st ON st.store_id = s.store_id
    WHERE s.id = ANY(p_suggestion_ids) AND s.tenant_id = p_tenant AND s.status = 'open'
    LIMIT 1;

  INSERT INTO purchase_requisitions
    (tenant_id, status, source, requested_by, notes, store_id, branch_id, created_by_user_id, updated_by_user_id)
  VALUES
    (p_tenant, 'submitted'::requisition_status_enum, 'reorder_engine', 'System Reorder Engine',
     'Generated from reorder suggestions', v_first_store, v_branch_id, v_caller, v_caller)
  RETURNING id INTO v_requisition;

  IF v_requisition IS NULL THEN
    RAISE EXCEPTION 'SUGGESTIONS_NOT_OPEN|nothing to convert' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO purchase_requisition_items
    (requisition_id, product_variant_id, qty_requested, preferred_supplier_id, est_unit_cost, reason, created_by_user_id, updated_by_user_id)
  SELECT
    v_requisition,
    s.product_variant_id,
    s.suggested_qty,
    s.preferred_supplier_id,
    COALESCE(sb.avg_cost, 0),
    'Reorder point reached',
    v_caller,
    v_caller
  FROM reorder_suggestions s
  LEFT JOIN (
    SELECT product_variant_id, AVG(avg_cost) AS avg_cost
    FROM stock_balances
    WHERE tenant_id = p_tenant
    GROUP BY product_variant_id
  ) sb ON sb.product_variant_id = s.product_variant_id
  WHERE s.id = ANY(p_suggestion_ids) AND s.tenant_id = p_tenant AND s.status = 'open';

  UPDATE reorder_suggestions
    SET status = 'converted', converted_requisition_id = v_requisition, updated_at = now(), updated_by_user_id = COALESCE(v_caller, updated_by_user_id)
    WHERE id = ANY(p_suggestion_ids) AND tenant_id = p_tenant AND status = 'open';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('requisition_id', v_requisition, 'suggestions_converted', v_count);
END;
$$;

NOTIFY pgrst, 'reload schema';
