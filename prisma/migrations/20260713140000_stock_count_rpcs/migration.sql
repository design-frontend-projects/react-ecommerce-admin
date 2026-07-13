BEGIN;

-- =============================================================================
-- Stock count RPCs.
--   snapshot_stock_count  draft -> counting  (freezes expected quantities)
--   review_stock_count    counting -> review (computes variances)
--   post_stock_count      review -> posted   (variance -> stocktake adjustment
--                         applied through apply_stock_adjustment, so the
--                         proven delta-to-live pipeline owns the stock effect)
-- =============================================================================

CREATE OR REPLACE FUNCTION "snapshot_stock_count"(p_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h        stock_counts%ROWTYPE;
  v_caller uuid := auth.uid();
  v_items  int;
BEGIN
  SELECT * INTO h FROM stock_counts WHERE id = p_count_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUNT_NOT_FOUND|%', p_count_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'draft' THEN
    RAISE EXCEPTION 'COUNT_INVALID_TRANSITION|%|counting', h.status USING ERRCODE = 'P0001';
  END IF;

  IF h.warehouse_location_id IS NOT NULL THEN
    -- location-scoped cycle count: freeze from stock_by_location
    INSERT INTO stock_count_items
      (stock_count_id, product_variant_id, warehouse_location_id, batch_id, qty_snapshot, unit_cost)
    SELECT p_count_id, l.product_variant_id, l.warehouse_location_id, l.batch_id, l.qty_on_hand,
           COALESCE(b.avg_cost, 0)
    FROM stock_by_location l
    LEFT JOIN stock_balances b
      ON b.store_id = l.store_id AND b.product_variant_id = l.product_variant_id
    JOIN product_variants pv ON pv.id = l.product_variant_id
    WHERE l.warehouse_location_id = h.warehouse_location_id
      AND l.tenant_id = h.tenant_id
      AND (h.category_id IS NULL OR EXISTS (
        SELECT 1 FROM products p WHERE p.product_id = pv.product_id AND p.category_id = h.category_id))
    ON CONFLICT DO NOTHING;
  ELSE
    -- store-wide count: freeze from stock_balances
    INSERT INTO stock_count_items
      (stock_count_id, product_variant_id, qty_snapshot, unit_cost)
    SELECT p_count_id, b.product_variant_id, b.qty_on_hand, b.avg_cost
    FROM stock_balances b
    JOIN product_variants pv ON pv.id = b.product_variant_id
    WHERE b.store_id = h.store_id AND b.tenant_id = h.tenant_id
      AND (h.category_id IS NULL OR EXISTS (
        SELECT 1 FROM products p WHERE p.product_id = pv.product_id AND p.category_id = h.category_id))
    ON CONFLICT DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_items = ROW_COUNT;

  UPDATE stock_counts
    SET status = 'counting', snapshot_at = now(), updated_at = now()
    WHERE id = p_count_id;

  RETURN jsonb_build_object('count_id', p_count_id, 'status', 'counting', 'items_frozen', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION "review_stock_count"(p_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h        stock_counts%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  SELECT * INTO h FROM stock_counts WHERE id = p_count_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUNT_NOT_FOUND|%', p_count_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'counting' THEN
    RAISE EXCEPTION 'COUNT_INVALID_TRANSITION|%|review', h.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE stock_count_items
    SET variance = qty_counted - qty_snapshot
    WHERE stock_count_id = p_count_id AND qty_counted IS NOT NULL;

  UPDATE stock_counts
    SET status = 'review', reviewed_by = COALESCE(reviewed_by, v_caller::text), updated_at = now()
    WHERE id = p_count_id;

  RETURN jsonb_build_object('count_id', p_count_id, 'status', 'review');
END;
$$;

CREATE OR REPLACE FUNCTION "post_stock_count"(p_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h            stock_counts%ROWTYPE;
  v_caller     uuid := auth.uid();
  v_adjustment uuid;
  v_variances  int;
  v_override   text;
  v_result     jsonb;
BEGIN
  SELECT * INTO h FROM stock_counts WHERE id = p_count_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUNT_NOT_FOUND|%', p_count_id USING ERRCODE = 'P0001';
  END IF;
  IF v_caller IS NOT NULL AND v_caller <> h.tenant_id THEN
    RAISE EXCEPTION 'FORBIDDEN|tenant mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF h.status <> 'review' THEN
    RAISE EXCEPTION 'COUNT_INVALID_TRANSITION|%|posted', h.status USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_variances
    FROM stock_count_items
    WHERE stock_count_id = p_count_id AND qty_counted IS NOT NULL
      AND COALESCE(variance, qty_counted - qty_snapshot) <> 0;

  IF v_variances = 0 THEN
    UPDATE stock_counts
      SET status = 'posted', posted_by = COALESCE(posted_by, v_caller::text), posted_at = now(), updated_at = now()
      WHERE id = p_count_id;
    RETURN jsonb_build_object('count_id', p_count_id, 'status', 'posted', 'variances', 0);
  END IF;

  INSERT INTO stock_adjustments
    (tenant_id, store_id, status, type, notes, created_by, auth_user_id)
  VALUES
    (h.tenant_id, h.store_id, 'draft', 'stocktake',
     'Variance from stock count ' || h.count_number, v_caller::text, h.tenant_id)
  RETURNING id INTO v_adjustment;

  INSERT INTO stock_adjustment_items
    (stock_adjustment_id, product_variant_id, qty_before, qty_after, qty_adjusted, unit_cost, reason, batch_id)
  SELECT v_adjustment, i.product_variant_id, i.qty_snapshot, i.qty_counted,
         COALESCE(i.variance, i.qty_counted - i.qty_snapshot),
         i.unit_cost, 'stocktake_discrepancy', i.batch_id
  FROM stock_count_items i
  WHERE i.stock_count_id = p_count_id AND i.qty_counted IS NOT NULL
    AND COALESCE(i.variance, i.qty_counted - i.qty_snapshot) <> 0;

  -- location-scoped counts post cycle_count_in/out; store-wide keeps
  -- adjustment_in/out semantics
  v_override := CASE WHEN h.warehouse_location_id IS NOT NULL THEN 'cycle_count' ELSE NULL END;
  v_result := apply_stock_adjustment(v_adjustment, v_override);

  UPDATE stock_counts
    SET status = 'posted',
        posted_by = COALESCE(posted_by, v_caller::text),
        posted_at = now(),
        posted_adjustment_id = v_adjustment,
        updated_at = now()
    WHERE id = p_count_id;

  RETURN jsonb_build_object(
    'count_id', p_count_id, 'status', 'posted',
    'variances', v_variances, 'adjustment', v_result);
END;
$$;

COMMIT;
