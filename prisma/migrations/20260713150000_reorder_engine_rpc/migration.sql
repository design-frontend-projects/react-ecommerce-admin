BEGIN;

-- =============================================================================
-- Reorder engine.
--   run_reorder_check(tenant, store?)  — evaluates active reorder_rules
--     against qty_available + on-order (open PO lines) and upserts one OPEN
--     reorder_suggestion per rule. Replaces the legacy inventory-table-based
--     checkAndTriggerReorder().
--   convert_reorder_suggestions(tenant, ids[]) — open suggestions -> a
--     purchase requisition (source 'reorder_engine') feeding the PO flow.
-- =============================================================================

CREATE OR REPLACE FUNCTION "run_reorder_check"(p_tenant uuid, p_store uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  r        record;
  v_available numeric;
  v_on_order  numeric;
  v_suggest   numeric;
  v_created   int := 0;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_tenant THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;

  FOR r IN
    SELECT rr.*
    FROM reorder_rules rr
    WHERE rr.tenant_id = p_tenant AND rr.is_active = true
      AND (p_store IS NULL OR rr.store_id = p_store)
    ORDER BY rr.store_id, rr.product_variant_id
  LOOP
    SELECT COALESCE(qty_available, qty_on_hand - qty_reserved), 0
      INTO v_available, v_on_order
      FROM stock_balances
      WHERE store_id = r.store_id AND product_variant_id = r.product_variant_id;
    v_available := COALESCE(v_available, 0);

    -- on-order = open PO lines for this variant (approved/sent/partial)
    SELECT COALESCE(SUM(GREATEST(poi.quantity_ordered - COALESCE(poi.received_quantity, 0), 0)), 0)
      INTO v_on_order
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.po_id = poi.po_id
      WHERE poi.product_variant_id = r.product_variant_id
        AND po.auth_user_id = p_tenant
        AND COALESCE(po.lifecycle_status, 'draft') IN ('approved', 'sent', 'partially_received');

    IF (v_available + v_on_order) <= (r.reorder_point + r.safety_stock) THEN
      v_suggest := COALESCE(
        r.reorder_qty,
        GREATEST(COALESCE(r.max_qty, 0) - v_available - v_on_order, COALESCE(r.eoq, 0), 0));
      IF v_suggest <= 0 THEN
        CONTINUE;
      END IF;

      INSERT INTO reorder_suggestions
        (tenant_id, reorder_rule_id, product_variant_id, store_id,
         qty_available_at_run, qty_on_order_at_run, suggested_qty,
         preferred_supplier_id, status, run_at, auth_user_id)
      VALUES
        (p_tenant, r.id, r.product_variant_id, r.store_id,
         v_available, v_on_order, v_suggest,
         r.preferred_supplier_id, 'open', now(), p_tenant)
      ON CONFLICT (reorder_rule_id) WHERE (status = 'open') DO UPDATE
        SET qty_available_at_run = EXCLUDED.qty_available_at_run,
            qty_on_order_at_run  = EXCLUDED.qty_on_order_at_run,
            suggested_qty        = EXCLUDED.suggested_qty,
            run_at               = now(),
            updated_at           = now();
      v_created := v_created + 1;
    ELSE
      -- demand satisfied: expire any stale open suggestion for this rule
      UPDATE reorder_suggestions
        SET status = 'expired', updated_at = now()
        WHERE reorder_rule_id = r.id AND status = 'open';
    END IF;
  END LOOP;

  RETURN jsonb_build_object('suggestions_open', v_created);
END;
$$;

CREATE OR REPLACE FUNCTION "convert_reorder_suggestions"(p_tenant uuid, p_suggestion_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_requisition uuid;
  v_count       int := 0;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_tenant THEN
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
         COALESCE(pv.cost_price, 0), 'Reorder point reached'
  FROM reorder_suggestions s
  JOIN product_variants pv ON pv.id = s.product_variant_id
  WHERE s.id = ANY(p_suggestion_ids) AND s.tenant_id = p_tenant AND s.status = 'open';

  UPDATE reorder_suggestions
    SET status = 'converted', converted_requisition_id = v_requisition, updated_at = now()
    WHERE id = ANY(p_suggestion_ids) AND tenant_id = p_tenant AND status = 'open';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('requisition_id', v_requisition, 'suggestions_converted', v_count);
END;
$$;

COMMIT;
