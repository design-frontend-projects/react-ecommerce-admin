-- ============================================================================
-- Migration: 20260828160000_create_inventory_reconcile_function
-- Description: Create public.inventory_reconcile(p_tenant, p_store) RPC function
--              for inventory invariant reconciliation checks across stock balances,
--              bin-level stock by location, variant cache, and serial tracking.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.inventory_reconcile(p_tenant uuid, p_store uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_vs_location jsonb;
  v_variant_cache jsonb;
  v_available jsonb;
  v_serials jsonb;
BEGIN
  -- 1. Invariant 1: Check stock_balances vs stock_by_location sum per (store_id, product_variant_id)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', b.store_id, 
      'product_variant_id', b.product_variant_id,
      'balance', b.qty_on_hand, 
      'location_sum', COALESCE(l.sum_qty, 0))), '[]'::jsonb)
  INTO v_balance_vs_location
  FROM stock_balances b
  LEFT JOIN (
    SELECT store_id, product_variant_id, SUM(qty_on_hand) AS sum_qty
    FROM stock_by_location
    WHERE tenant_id = p_tenant
      AND (p_store IS NULL OR store_id = p_store)
    GROUP BY store_id, product_variant_id
  ) l ON (l.store_id IS NOT DISTINCT FROM b.store_id) AND l.product_variant_id = b.product_variant_id
  WHERE b.tenant_id = p_tenant
    AND (p_store IS NULL OR b.store_id = p_store)
    AND b.qty_on_hand <> COALESCE(l.sum_qty, 0);

  -- 2. Invariant 2: Check product_variants.stock_quantity cache vs sum of stock_balances
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'product_variant_id', pv.id, 
      'cache', pv.stock_quantity, 
      'actual', COALESCE(b.sum_qty, 0))), '[]'::jsonb)
  INTO v_variant_cache
  FROM product_variants pv
  LEFT JOIN (
    SELECT product_variant_id, round(SUM(qty_on_hand)) AS sum_qty
    FROM stock_balances 
    WHERE tenant_id = p_tenant 
      AND (p_store IS NULL OR store_id = p_store)
    GROUP BY product_variant_id
  ) b ON b.product_variant_id = pv.id
  WHERE pv.tenant_id = p_tenant
    AND COALESCE(pv.stock_quantity, 0) <> COALESCE(b.sum_qty, 0);

  -- 3. Invariant 3: Check qty_available = qty_on_hand - qty_reserved
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', store_id, 
      'product_variant_id', product_variant_id,
      'qty_available', qty_available, 
      'expected', qty_on_hand - qty_reserved)), '[]'::jsonb)
  INTO v_available
  FROM stock_balances
  WHERE tenant_id = p_tenant
    AND (p_store IS NULL OR store_id = p_store)
    AND COALESCE(qty_available, 0) <> (qty_on_hand - qty_reserved);

  -- 4. Invariant 4: Check serials count for serial-tracked items
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'store_id', b.store_id, 
      'product_variant_id', b.product_variant_id,
      'on_hand', b.qty_on_hand, 
      'serials_in_stock', COALESCE(s.cnt, 0))), '[]'::jsonb)
  INTO v_serials
  FROM stock_balances b
  JOIN product_variants pv ON pv.id = b.product_variant_id
  JOIN products pr ON pr.id = pv.product_id AND pr.is_serial_tracked = true
  LEFT JOIN (
    SELECT store_id, product_variant_id, count(*) AS cnt
    FROM product_serials 
    WHERE tenant_id = p_tenant AND status = 'in_stock'
    GROUP BY store_id, product_variant_id
  ) s ON (s.store_id IS NOT DISTINCT FROM b.store_id) AND s.product_variant_id = b.product_variant_id
  WHERE b.tenant_id = p_tenant
    AND (p_store IS NULL OR b.store_id = p_store)
    AND b.qty_on_hand <> COALESCE(s.cnt, 0);

  -- Return reconciliation summary object
  RETURN jsonb_build_object(
    'clean', (v_balance_vs_location = '[]'::jsonb AND v_variant_cache = '[]'::jsonb
              AND v_available = '[]'::jsonb AND v_serials = '[]'::jsonb),
    'balance_vs_location', v_balance_vs_location,
    'variant_cache', v_variant_cache,
    'qty_available', v_available,
    'serial_counts', v_serials);
END;
$$;

GRANT EXECUTE ON FUNCTION public.inventory_reconcile(uuid, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
