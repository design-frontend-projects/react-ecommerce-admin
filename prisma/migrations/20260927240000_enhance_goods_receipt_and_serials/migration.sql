-- Enhance Goods Receipt and Serials Migration
-- Normalized batch, serial, authoritative PO relation, indexes, and FKs

-- 1. Ensure warehouse_id is not null on historical goods_receipts
UPDATE goods_receipts
SET warehouse_id = (
  SELECT id FROM warehouses WHERE tenant_id = goods_receipts.tenant_id AND is_active = true ORDER BY created_at ASC LIMIT 1
)
WHERE warehouse_id IS NULL;

-- 2. Backfill posted_by_user_id
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS posted_by_user_id UUID;
UPDATE goods_receipts
SET posted_by_user_id = COALESCE(updated_by_user_id, created_by_user_id)
WHERE status = 'posted' AND posted_by_user_id IS NULL;

-- 3. Backfill batch_id from batch_number for existing goods_receipt_items
DO $$
DECLARE
  r RECORD;
  v_batch_id UUID;
BEGIN
  FOR r IN
    SELECT gri.id, gri.product_variant_id, gri.batch_number, gri.expiry_date, gri.unit_cost, gr.tenant_id, gri.created_by_user_id
    FROM goods_receipt_items gri
    JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
    WHERE gri.batch_id IS NULL AND gri.batch_number IS NOT NULL AND gri.batch_number <> ''
  LOOP
    SELECT id INTO v_batch_id
    FROM product_batches
    WHERE tenant_id = r.tenant_id
      AND product_variant_id = r.product_variant_id
      AND batch_number = r.batch_number
    LIMIT 1;

    IF v_batch_id IS NULL THEN
      INSERT INTO product_batches (
        id, tenant_id, product_variant_id, batch_number, expiry_date, unit_cost, status, created_by_user_id, updated_by_user_id, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), r.tenant_id, r.product_variant_id, r.batch_number, r.expiry_date, COALESCE(r.unit_cost, 0), 'active', r.created_by_user_id, r.created_by_user_id, now(), now()
      ) RETURNING id INTO v_batch_id;
    END IF;

    UPDATE goods_receipt_items SET batch_id = v_batch_id WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Create goods_receipt_item_serials table
CREATE TABLE IF NOT EXISTS goods_receipt_item_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_item_id UUID NOT NULL,
  serial_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT uq_goods_receipt_item_serials UNIQUE (goods_receipt_item_id, serial_id)
);

-- 5. Backfill goods_receipt_item_serials from existing serial_numbers JSON
DO $$
DECLARE
  r RECORD;
  s TEXT;
  v_serial_id UUID;
BEGIN
  FOR r IN
    SELECT gri.id AS gri_id, gri.product_variant_id, gri.batch_id, gri.unit_cost, gr.tenant_id, gri.created_by_user_id, gri.serial_numbers
    FROM goods_receipt_items gri
    JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
    WHERE gri.serial_numbers IS NOT NULL AND jsonb_typeof(gri.serial_numbers) = 'array'
  LOOP
    FOR s IN SELECT jsonb_array_elements_text(r.serial_numbers)
    LOOP
      IF s IS NOT NULL AND trim(s) <> '' THEN
        SELECT id INTO v_serial_id
        FROM product_serials
        WHERE tenant_id = r.tenant_id
          AND product_variant_id = r.product_variant_id
          AND serial_number = trim(s)
        LIMIT 1;

        IF v_serial_id IS NULL THEN
          INSERT INTO product_serials (
            id, tenant_id, product_variant_id, batch_id, serial_number, status, unit_cost, received_at, created_by_user_id, updated_by_user_id, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), r.tenant_id, r.product_variant_id, r.batch_id, trim(s), 'in_stock', COALESCE(r.unit_cost, 0), now(), r.created_by_user_id, r.created_by_user_id, now(), now()
          ) RETURNING id INTO v_serial_id;
        END IF;

        INSERT INTO goods_receipt_item_serials (id, goods_receipt_item_id, serial_id, created_at)
        VALUES (gen_random_uuid(), r.gri_id, v_serial_id, now())
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 6. Add Foreign Key constraints and NOT NULLs
ALTER TABLE goods_receipts ALTER COLUMN purchase_order_id SET NOT NULL;
ALTER TABLE goods_receipts ALTER COLUMN warehouse_id SET NOT NULL;
ALTER TABLE goods_receipt_items ALTER COLUMN purchase_order_item_id SET NOT NULL;

-- Drop redundant columns
ALTER TABLE goods_receipts DROP COLUMN IF EXISTS store_id;
ALTER TABLE goods_receipts DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE goods_receipts DROP COLUMN IF EXISTS created_by;
ALTER TABLE goods_receipts DROP COLUMN IF EXISTS posted_by;

ALTER TABLE goods_receipt_items DROP COLUMN IF EXISTS batch_number;
ALTER TABLE goods_receipt_items DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE goods_receipt_items DROP COLUMN IF EXISTS serial_id;
ALTER TABLE goods_receipt_items DROP COLUMN IF EXISTS serial_numbers;

-- Add FKs if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipts_po') THEN
    ALTER TABLE goods_receipts ADD CONSTRAINT fk_goods_receipts_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipts_warehouse') THEN
    ALTER TABLE goods_receipts ADD CONSTRAINT fk_goods_receipts_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_items_receipt') THEN
    ALTER TABLE goods_receipt_items ADD CONSTRAINT fk_goods_receipt_items_receipt FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_items_po_item') THEN
    ALTER TABLE goods_receipt_items ADD CONSTRAINT fk_goods_receipt_items_po_item FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_items_variant') THEN
    ALTER TABLE goods_receipt_items ADD CONSTRAINT fk_goods_receipt_items_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_items_uom') THEN
    ALTER TABLE goods_receipt_items ADD CONSTRAINT fk_goods_receipt_items_uom FOREIGN KEY (uom_id) REFERENCES uoms(id) ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_items_location') THEN
    ALTER TABLE goods_receipt_items ADD CONSTRAINT fk_goods_receipt_items_location FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(id) ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_items_batch') THEN
    ALTER TABLE goods_receipt_items ADD CONSTRAINT fk_goods_receipt_items_batch FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_item_serials_item') THEN
    ALTER TABLE goods_receipt_item_serials ADD CONSTRAINT fk_goods_receipt_item_serials_item FOREIGN KEY (goods_receipt_item_id) REFERENCES goods_receipt_items(id) ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_goods_receipt_item_serials_serial') THEN
    ALTER TABLE goods_receipt_item_serials ADD CONSTRAINT fk_goods_receipt_item_serials_serial FOREIGN KEY (serial_id) REFERENCES product_serials(id) ON UPDATE NO ACTION;
  END IF;
END $$;

-- 7. Add Indexes
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant_po ON goods_receipts (tenant_id, purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant_number ON goods_receipts (tenant_id, receipt_number);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_receipt_id ON goods_receipt_items (goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_po_item_id ON goods_receipt_items (purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_variant_id ON goods_receipt_items (product_variant_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_item_serials_item ON goods_receipt_item_serials (goods_receipt_item_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_item_serials_serial ON goods_receipt_item_serials (serial_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_lifecycle ON purchase_orders (tenant_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_tenant_variant ON purchase_order_items (tenant_id, product_variant_id);

-- 8. Enable RLS on goods_receipt_item_serials
ALTER TABLE goods_receipt_item_serials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goods_receipt_item_serials_tenant_isolation" ON goods_receipt_item_serials;
CREATE POLICY "goods_receipt_item_serials_tenant_isolation" ON goods_receipt_item_serials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM goods_receipt_items gri
    JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
    WHERE gri.id = goods_receipt_item_serials.goods_receipt_item_id
      AND gr.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
);

-- 9. Update post_goods_receipt stored procedure to align with enhanced schema
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
  v_item_accounted_qty   numeric := 0;
  v_po_total_received    numeric := 0;
  v_inventory_item_id    uuid;
  v_po_status            po_lifecycle_status_enum;
  v_po_supplier_id       uuid;
BEGIN
  -- 1. Lock the receipt record
  SELECT * INTO h FROM goods_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECEIPT_NOT_FOUND|Goods receipt % not found', p_receipt_id USING ERRCODE = 'P0001';
  END IF;

  IF h.status <> 'draft' THEN
    RAISE EXCEPTION 'RECEIPT_ALREADY_POSTED|Goods receipt % is in status %', p_receipt_id, h.status USING ERRCODE = 'P0001';
  END IF;

  -- Verify PO is receivable
  SELECT lifecycle_status, supplier_id INTO v_po_status, v_po_supplier_id
  FROM purchase_orders WHERE id = h.purchase_order_id;
  IF v_po_status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'PO_NOT_RECEIVABLE|Purchase order % is %', h.purchase_order_id, v_po_status USING ERRCODE = 'P0001';
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
      NULL,
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

  -- 5. Process each item: update stock balances, movements, and PO items
  FOR it IN
    SELECT * FROM goods_receipt_items
    WHERE goods_receipt_id = p_receipt_id
    ORDER BY created_at
  LOOP
    v_qty := COALESCE(it.accepted_qty, 0);
    v_item_accounted_qty := v_qty + COALESCE(it.rejected_qty, 0);

    -- Only move inventory into stock balances and movements if accepted_qty > 0
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

      -- Ensure inventory_items record exists
      SELECT id INTO v_inventory_item_id FROM inventory_items
      WHERE tenant_id = h.tenant_id AND product_variant_id = it.product_variant_id LIMIT 1;

      IF v_inventory_item_id IS NULL THEN
        INSERT INTO inventory_items (tenant_id, product_variant_id, sku, is_stockable, is_purchasable, is_sellable, created_at, updated_at)
        SELECT h.tenant_id, it.product_variant_id, COALESCE(pv.sku, 'ITEM-' || substr(it.product_variant_id::text, 1, 8)), true, true, true, now(), now()
        FROM product_variants pv WHERE pv.id = it.product_variant_id
        RETURNING id INTO v_inventory_item_id;
      END IF;

      -- Update or Insert stock_balances
      SELECT id INTO v_balance_id
        FROM stock_balances
        WHERE tenant_id = h.tenant_id
          AND product_variant_id = it.product_variant_id
          AND (warehouse_id = h.warehouse_id OR (warehouse_id IS NULL AND h.warehouse_id IS NULL))
          AND (location_id = v_location OR (location_id IS NULL AND v_location IS NULL))
          AND condition = it.condition
          AND (batch_id = it.batch_id OR (batch_id IS NULL AND it.batch_id IS NULL))
        LIMIT 1;

      IF v_balance_id IS NOT NULL THEN
        UPDATE stock_balances
        SET qty_on_hand = qty_on_hand + v_qty,
            qty_available = COALESCE(qty_available, 0) + v_qty,
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
          inventory_item_id,
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
          NULL,
          v_location,
          v_inventory_item_id,
          it.product_variant_id,
          it.condition,
          it.batch_id,
          NULL,
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

      -- Update or Insert stock_by_location
      IF v_location IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM stock_by_location
          WHERE tenant_id = h.tenant_id
            AND warehouse_id = h.warehouse_id
            AND warehouse_location_id = v_location
            AND product_variant_id = it.product_variant_id
            AND condition = it.condition
            AND (batch_id = it.batch_id OR (batch_id IS NULL AND it.batch_id IS NULL))
        ) THEN
          UPDATE stock_by_location
          SET qty_on_hand = qty_on_hand + v_qty,
              last_movement_at = now(),
              updated_at = now()
          WHERE tenant_id = h.tenant_id
            AND warehouse_id = h.warehouse_id
            AND warehouse_location_id = v_location
            AND product_variant_id = it.product_variant_id
            AND condition = it.condition
            AND (batch_id = it.batch_id OR (batch_id IS NULL AND it.batch_id IS NULL));
        ELSE
          INSERT INTO stock_by_location (
            tenant_id, warehouse_id, warehouse_location_id, product_variant_id, batch_id,
            condition, qty_on_hand, qty_reserved, last_movement_at, created_at, updated_at
          ) VALUES (
            h.tenant_id, h.warehouse_id, v_location, it.product_variant_id, it.batch_id,
            it.condition, v_qty, 0, now(), now(), now()
          );
        END IF;
      END IF;

      -- Create inventory_movements ledger entry
      INSERT INTO inventory_movements (
        id, tenant_id, warehouse_id, location_id, warehouse_location_id, product_variant_id,
        movement_type, status, condition, quantity_delta, unit_cost, total_cost,
        reference_type, reference_id, source_document_type, source_document_id,
        batch_id, occurred_at, movement_date, created_at, created_by_user_id
      ) VALUES (
        gen_random_uuid(), h.tenant_id, h.warehouse_id, v_location, v_location, it.product_variant_id,
        'purchase', 'posted', it.condition, v_qty, COALESCE(it.unit_cost, 0), v_qty * COALESCE(it.unit_cost, 0),
        'goods_receipt', p_receipt_id, 'goods_receipt', p_receipt_id,
        it.batch_id, now(), now(), now(), h.created_by_user_id
      );

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
          NULL,
          v_location,
          it.condition,
          it.batch_id,
          NULL,
          'goods_receipt_item',
          it.id,
          now()
        );
      END IF;
    END IF;

    -- Update purchase_order_items received_quantity with total accounted units (accepted + rejected)
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
      posted_by_user_id = COALESCE(posted_by_user_id, v_caller, h.updated_by_user_id, h.created_by_user_id),
      posted_at = now(),
      updated_at = now()
  WHERE id = p_receipt_id;

  -- 7. Update purchase order lifecycle (using lifecycle_status)
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

