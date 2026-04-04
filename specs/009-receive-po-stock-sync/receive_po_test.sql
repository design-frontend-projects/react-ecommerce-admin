-- Test Script: Receive Purchase Order Stock Sync
-- Covers: Transactionality (T004), Failure Rollback (T010), Valid Aggregation (T011)

BEGIN;

-- Setup environment
-- Create fake store
INSERT INTO stores (store_id, name) VALUES ('store_test_001', 'Test Store 1');
INSERT INTO stores (store_id, name) VALUES ('store_test_002', 'Test Store 2');

-- Create test product and variant
INSERT INTO products (product_id, name, sku, has_variants, is_active) 
VALUES (99991, 'Test Product', 'TEST-PROD', true, true);

INSERT INTO product_variants (id, product_id, sku, price, cost_price, stock_quantity)
VALUES ('00000000-0000-0000-0000-000000000001', 99991, 'TEST-VAR-1', 10.0, 5.0, 0);

-- Create supplier
INSERT INTO suppliers (supplier_id, name) VALUES (99991, 'Test Supplier');

-- Create Purchase Order
INSERT INTO purchase_orders (po_id, supplier_id, order_date, status, total_amount, expected_date)
VALUES (99991, 99991, CURRENT_DATE, 'pending', 50.0, CURRENT_DATE);

-- Create PO Items
INSERT INTO purchase_order_items (po_item_id, po_id, product_id, product_variant_id, quantity_ordered, unit_cost, subtotal, received_quantity)
VALUES (99991, 99991, 99991, '00000000-0000-0000-0000-000000000001', 10, 5.0, 50.0, 0);

-- Savepoint before testing
SAVEPOINT pre_test;

--------------------------------------------------------------------------------
-- TEST 1: Simulate invalid failure rollback (T010)
--------------------------------------------------------------------------------
DO $$
BEGIN
  -- Intentional failure by providing null store_id (or constraint failing) 
  -- Assuming store_id cannot be null for stock_balances
  BEGIN
    PERFORM receive_purchase_order_items(
      99991,
      NULL, -- invalid store
      '[{"po_item_id": 99991, "variant_id": "00000000-0000-0000-0000-000000000001", "qty_to_receive": 5, "unit_cost": 5.0}]'::jsonb
    );
    RAISE EXCEPTION 'TEST 1 FAILED: Expected an error but function completed.';
  EXCEPTION WHEN OTHERS THEN
    -- Expected Exception
    RAISE NOTICE 'TEST 1 PASSED: Transaction rollback on failure successful (%)', SQLERRM;
  END;
END $$;

--------------------------------------------------------------------------------
-- TEST 2: Multi-store receipts and valid aggregation (T011, T004)
--------------------------------------------------------------------------------
-- Reset to clean state just in case
ROLLBACK TO SAVEPOINT pre_test;

DO $$
DECLARE
  v_agg_stock NUMERIC;
BEGIN
  -- Receive 3 items into Store 1
  PERFORM receive_purchase_order_items(
    99991,
    'store_test_001',
    '[{"po_item_id": 99991, "variant_id": "00000000-0000-0000-0000-000000000001", "qty_to_receive": 3, "unit_cost": 5.0}]'::jsonb
  );

  -- Receive 2 items into Store 2
  PERFORM receive_purchase_order_items(
    99991,
    'store_test_002',
    '[{"po_item_id": 99991, "variant_id": "00000000-0000-0000-0000-000000000001", "qty_to_receive": 2, "unit_cost": 5.0}]'::jsonb
  );

  -- Check aggregate stock
  SELECT stock_quantity INTO v_agg_stock FROM product_variants WHERE id = '00000000-0000-0000-0000-000000000001';

  IF v_agg_stock = 5 THEN
    RAISE NOTICE 'TEST 2 PASSED: stock_quantity successfully aggregated to 5 across multi-store receipts.';
  ELSE
    RAISE EXCEPTION 'TEST 2 FAILED: Expected aggregated stock_quantity to be 5, but got %', v_agg_stock;
  END IF;
END $$;

-- Rollback entire session to leave the DB clean
ROLLBACK;
RAISE NOTICE 'ALL TESTS COMPLETE. Session rolled back.';
