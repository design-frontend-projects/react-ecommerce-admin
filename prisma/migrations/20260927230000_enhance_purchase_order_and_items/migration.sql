-- =============================================================================
-- Migration: 20260927230000_enhance_purchase_order_and_items
-- Description:
--   1. Purchase Order Items:
--      - Drop redundant product_id, has_expiration, expiration_date
--      - Set product_variant_id NOT NULL and foreign key to product_variants
--      - Support fractional quantities: quantity_ordered numeric(18, 4)
--      - Align precision to Decimal(18, 4) for monetary and calculation fields
--      - Add total_amount, created_at, updated_at
--      - Add unique constraints (po_id, line_no) and (po_id, product_variant_id)
--      - Add indexes on po_id, product_variant_id, tenant_id
--   2. Purchase Orders:
--      - Drop duplicate totals (total_amount, tax_amount, discount_amount)
--      - Drop duplicate status column (lifecycle_status is authoritative)
--      - Standardize created_at to timestamptz(6), add updated_at timestamptz(6)
--      - Add indexes on tenant_id, supplier_id, warehouse_id
--   3. Database Routines:
--      - Update set_purchase_order_status and post_goods_receipt to remove references to purchase_orders.status
-- =============================================================================

-- Step 1: Purchase Order Items Schema Changes
-- 1.1 Drop foreign key constraint on product_id
ALTER TABLE "purchase_order_items" DROP CONSTRAINT IF EXISTS "fk_purchase_order_items_products";

-- 1.2 Drop obsolete columns from purchase_order_items
ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "product_id";
ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "has_expiration";
ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "expiration_date";

-- 1.3 Ensure product_variant_id is NOT NULL
-- (Safe: previously verified 0 records with null product_variant_id)
ALTER TABLE "purchase_order_items" ALTER COLUMN "product_variant_id" SET NOT NULL;

-- 1.4 Update foreign key for product_variant_id to RESTRICT on delete
ALTER TABLE "purchase_order_items" DROP CONSTRAINT IF EXISTS "fk_purchase_order_items_variants";
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "fk_purchase_order_items_variants"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- 1.5 Convert quantity_ordered and monetary fields to numeric(18, 4)
ALTER TABLE "purchase_order_items" ALTER COLUMN "quantity_ordered" TYPE numeric(18, 4);
ALTER TABLE "purchase_order_items" ALTER COLUMN "unit_cost" TYPE numeric(18, 4);
ALTER TABLE "purchase_order_items" ALTER COLUMN "subtotal" TYPE numeric(18, 4);
ALTER TABLE "purchase_order_items" ALTER COLUMN "subtotal" SET DEFAULT 0;
ALTER TABLE "purchase_order_items" ALTER COLUMN "discount_amount" TYPE numeric(18, 4);
ALTER TABLE "purchase_order_items" ALTER COLUMN "discount_amount" SET DEFAULT 0;
ALTER TABLE "purchase_order_items" ALTER COLUMN "tax_amount" TYPE numeric(18, 4);
ALTER TABLE "purchase_order_items" ALTER COLUMN "tax_amount" SET DEFAULT 0;
ALTER TABLE "purchase_order_items" ALTER COLUMN "received_quantity" TYPE numeric(18, 4);
ALTER TABLE "purchase_order_items" ALTER COLUMN "cancelled_qty" TYPE numeric(18, 4);

-- 1.6 Add total_amount and audit timestamps to purchase_order_items
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "total_amount" numeric(18, 4) DEFAULT 0;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) DEFAULT now();
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT now();

-- 1.7 Backfill total_amount on purchase_order_items
UPDATE "purchase_order_items"
SET "total_amount" = COALESCE("subtotal", 0) - COALESCE("discount_amount", 0) + COALESCE("tax_amount", 0)
WHERE "total_amount" IS NULL OR "total_amount" = 0;

-- 1.8 Add indexes and unique constraints on purchase_order_items
CREATE INDEX IF NOT EXISTS "idx_purchase_order_items_po_id" ON "purchase_order_items"("po_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_order_items_variant_id" ON "purchase_order_items"("product_variant_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_order_items_tenant_id" ON "purchase_order_items"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_purchase_order_items_po_line" ON "purchase_order_items"("po_id", "line_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_purchase_order_items_po_variant" ON "purchase_order_items"("po_id", "product_variant_id");

-- Step 2: Purchase Orders Schema Changes
-- 2.1 Backfill lifecycle_status before dropping status
UPDATE "purchase_orders"
SET "lifecycle_status" = CASE
  WHEN "status" = 'pending' THEN 'draft'::po_lifecycle_status_enum
  WHEN "status" = 'partial' THEN 'partially_received'::po_lifecycle_status_enum
  WHEN "status" = 'received' THEN 'received'::po_lifecycle_status_enum
  WHEN "status" = 'cancelled' THEN 'cancelled'::po_lifecycle_status_enum
  ELSE COALESCE("lifecycle_status", 'draft'::po_lifecycle_status_enum)
END
WHERE "lifecycle_status" IS NULL;

ALTER TABLE "purchase_orders" ALTER COLUMN "lifecycle_status" SET DEFAULT 'draft'::po_lifecycle_status_enum;

-- 2.2 Drop duplicate totals and status columns from purchase_orders
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "total_amount";
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "tax_amount";
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "discount_amount";
ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "status";

-- 2.3 Align totals precision to numeric(18, 4)
ALTER TABLE "purchase_orders" ALTER COLUMN "subtotal" TYPE numeric(18, 4);
ALTER TABLE "purchase_orders" ALTER COLUMN "discount_total" TYPE numeric(18, 4);
ALTER TABLE "purchase_orders" ALTER COLUMN "tax_total" TYPE numeric(18, 4);
ALTER TABLE "purchase_orders" ALTER COLUMN "shipping_amount" TYPE numeric(18, 4);
ALTER TABLE "purchase_orders" ALTER COLUMN "shipping_amount" SET DEFAULT 0;
ALTER TABLE "purchase_orders" ALTER COLUMN "grand_total" TYPE numeric(18, 4);

-- 2.4 Standardize audit fields on purchase_orders
ALTER TABLE "purchase_orders" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at"::timestamptz;
ALTER TABLE "purchase_orders" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT now();

-- 2.5 Add indexes on purchase_orders
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_tenant_id" ON "purchase_orders"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_supplier_id" ON "purchase_orders"("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_warehouse_id" ON "purchase_orders"("warehouse_id");

-- Step 3: Update PostgreSQL Functions (Remove purchase_orders.status references)
-- 3.1 set_purchase_order_status
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
    WHEN p_status = v_from THEN true
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

  -- 3. Apply updates without referencing removed status column
  UPDATE purchase_orders
    SET lifecycle_status = p_status,
        approved_by      = CASE WHEN p_status = 'approved' THEN COALESCE(approved_by, v_caller::text) ELSE approved_by END,
        approved_at      = CASE WHEN p_status = 'approved' THEN COALESCE(approved_at, now()) ELSE approved_at END,
        sent_at          = CASE WHEN p_status = 'sent' THEN COALESCE(sent_at, now()) ELSE sent_at END,
        closed_at        = CASE WHEN p_status = 'closed' THEN COALESCE(closed_at, now()) ELSE closed_at END,
        updated_at       = now()
    WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'po_id', p_po_id,
    'from', v_from,
    'to', p_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_purchase_order_status(uuid, po_lifecycle_status_enum) TO authenticated, service_role, anon;

-- 3.2 post_goods_receipt (recreated without status update on purchase_orders)
CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h                      goods_receipts%ROWTYPE;
  it                     goods_receipt_items%ROWTYPE;
  v_caller               uuid := auth.uid();
  v_type_id              uuid;
  v_txn_id               uuid := gen_random_uuid();
  v_txn_number           varchar;
  v_location             uuid;
  v_balance_id           uuid;
  v_qty                  numeric;
  v_total_qty            numeric := 0;
  v_total_cost           numeric := 0;
  v_total_items          int := 0;
  v_accepted_count       int := 0;
  v_open                 int;
  v_store_id             uuid := NULL;
  v_item_accounted_qty   numeric := 0;
  v_po_total_received    numeric := 0;
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

  -- 3. Count items and calculate accepted totals
  FOR it IN
    SELECT * FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id
    ORDER BY created_at
  LOOP
    v_total_items := v_total_items + 1;
    v_qty := COALESCE(it.accepted_qty, 0);
    IF v_qty > 0 THEN
      v_total_qty := v_total_qty + v_qty;
      v_total_cost := v_total_cost + (v_qty * COALESCE(it.unit_cost, 0));
      v_accepted_count := v_accepted_count + 1;
    END IF;
  END LOOP;

  IF v_total_items = 0 THEN
    RAISE EXCEPTION 'RECEIPT_EMPTY|Goods receipt has no line items' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Create the inventory_transactions header (if items were accepted)
  IF v_type_id IS NOT NULL AND v_accepted_count > 0 THEN
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
    v_qty := COALESCE(it.accepted_qty, 0);
    v_item_accounted_qty := v_qty + COALESCE(it.rejected_qty, 0);

    -- Only move inventory into stock balances if accepted_qty > 0
    IF v_qty > 0 THEN
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
    END IF;

    -- Update purchase_order_items received_quantity with total accounted units
    IF it.purchase_order_item_id IS NOT NULL AND v_item_accounted_qty > 0 THEN
      UPDATE purchase_order_items
      SET received_quantity = COALESCE(received_quantity, 0) + v_item_accounted_qty,
          updated_at = now()
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

  -- 7. Update purchase order lifecycle if linked (using lifecycle_status only)
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
        updated_at = now()
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

-- Step 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
