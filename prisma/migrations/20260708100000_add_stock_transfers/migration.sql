BEGIN;

-- =============================================================================
-- Stock Transfers: inter-store movement of stock.
-- Header + items tables, plus the shared inventory_allow_negative() helper and
-- the apply_stock_transfer() RPC that atomically writes paired transfer_out /
-- transfer_in rows to inventory_movements and updates both stores' balances.
-- =============================================================================

CREATE TABLE "stock_transfers" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      UUID NOT NULL,
  "from_store_id"  UUID NOT NULL,
  "to_store_id"    UUID NOT NULL,
  "from_branch_id" UUID,
  "to_branch_id"   UUID,
  "status"         "transfer_status_enum" NOT NULL DEFAULT 'draft',
  "reference_no"   VARCHAR(50),
  "notes"          TEXT,
  "created_by"     TEXT,
  "shipped_by"     TEXT,
  "received_by"    TEXT,
  "shipped_at"     TIMESTAMPTZ(6),
  "received_at"    TIMESTAMPTZ(6),
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"   UUID DEFAULT auth.uid(),
  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfers_from_store_id_fkey"
    FOREIGN KEY ("from_store_id") REFERENCES "stores" ("store_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "stock_transfers_to_store_id_fkey"
    FOREIGN KEY ("to_store_id") REFERENCES "stores" ("store_id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "stock_transfers_from_branch_id_fkey"
    FOREIGN KEY ("from_branch_id") REFERENCES "branches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "stock_transfers_to_branch_id_fkey"
    FOREIGN KEY ("to_branch_id") REFERENCES "branches" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE "stock_transfer_items" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "stock_transfer_id"  UUID NOT NULL,
  "product_variant_id" UUID NOT NULL,
  "qty"                DECIMAL(18,4) NOT NULL,
  "unit_cost"          DECIMAL(18,4) NOT NULL DEFAULT 0,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transfer_items_stock_transfer_id_fkey"
    FOREIGN KEY ("stock_transfer_id") REFERENCES "stock_transfers" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_transfer_items_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "idx_stock_transfers_tenant_id" ON "stock_transfers" ("tenant_id");
CREATE INDEX "idx_stock_transfers_from_store_id" ON "stock_transfers" ("from_store_id");
CREATE INDEX "idx_stock_transfers_to_store_id" ON "stock_transfers" ("to_store_id");
CREATE INDEX "idx_stock_transfers_status" ON "stock_transfers" ("status");
CREATE INDEX "idx_stock_transfer_items_transfer_id" ON "stock_transfer_items" ("stock_transfer_id");
CREATE INDEX "idx_stock_transfer_items_variant_id" ON "stock_transfer_items" ("product_variant_id");

-- updated_at trigger
CREATE OR REPLACE FUNCTION "set_stock_transfers_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_stock_transfers_updated_at"
BEFORE UPDATE ON "stock_transfers"
FOR EACH ROW EXECUTE FUNCTION "set_stock_transfers_updated_at"();

-- Row Level Security: tenant-scoped for authenticated clients. Server fns use the
-- service role (bypasses RLS); the apply RPC is SECURITY DEFINER (bypasses RLS).
ALTER TABLE "stock_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_transfer_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_transfers_all_own" ON "stock_transfers"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid())
  WITH CHECK ("auth_user_id" = auth.uid());

CREATE POLICY "stock_transfer_items_all_own" ON "stock_transfer_items"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "stock_transfers" t
    WHERE t."id" = "stock_transfer_items"."stock_transfer_id"
      AND t."auth_user_id" = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "stock_transfers" t
    WHERE t."id" = "stock_transfer_items"."stock_transfer_id"
      AND t."auth_user_id" = auth.uid()));

-- =============================================================================
-- inventory_allow_negative(): reads the per-tenant app_settings flag
-- 'inventory.allow_negative_stock' (JSON boolean). Defaults to false.
-- Shared by apply_stock_transfer() and apply_stock_adjustment().
-- =============================================================================
CREATE OR REPLACE FUNCTION "inventory_allow_negative"(p_tenant uuid, p_store uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (value #>> '{}')::boolean
       FROM app_settings
      WHERE key = 'inventory.allow_negative_stock'
        AND auth_user_id = p_tenant
      ORDER BY updated_at DESC
      LIMIT 1),
    false);
$$;

-- =============================================================================
-- apply_stock_transfer(): atomically apply a draft transfer.
--   * paired transfer_out (source) + transfer_in (destination) ledger rows
--   * decrement source balance, upsert destination (weighted-average cost)
--   * qty_available is a PLAIN column, so it is explicitly maintained
--   * idempotent: rejects already-received/cancelled transfers
-- =============================================================================
CREATE OR REPLACE FUNCTION "apply_stock_transfer"(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h              stock_transfers%ROWTYPE;
  it             stock_transfer_items%ROWTYPE;
  v_from_branch  uuid;
  v_to_branch    uuid;
  v_allow_neg    boolean;
  v_src_qty      numeric;
  v_src_avg      numeric;
  v_unit_cost    numeric;
  v_count        int := 0;
BEGIN
  SELECT * INTO h FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_NOT_FOUND|%', p_transfer_id USING ERRCODE = 'P0001';
  END IF;
  IF h.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'TRANSFER_ALREADY_APPLIED|%', h.status USING ERRCODE = 'P0001';
  END IF;
  IF h.from_store_id = h.to_store_id THEN
    RAISE EXCEPTION 'TRANSFER_SAME_STORE|%', h.from_store_id USING ERRCODE = 'P0001';
  END IF;

  v_from_branch := COALESCE(h.from_branch_id, (SELECT branch_id FROM stores WHERE store_id = h.from_store_id));
  v_to_branch   := COALESCE(h.to_branch_id,   (SELECT branch_id FROM stores WHERE store_id = h.to_store_id));
  IF v_from_branch IS NULL OR v_to_branch IS NULL THEN
    RAISE EXCEPTION 'TRANSFER_BRANCH_MISSING|source or destination store has no branch' USING ERRCODE = 'P0001';
  END IF;

  v_allow_neg := inventory_allow_negative(h.tenant_id, h.from_store_id);

  FOR it IN SELECT * FROM stock_transfer_items WHERE stock_transfer_id = p_transfer_id LOOP
    IF it.qty IS NULL OR it.qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT qty_on_hand, avg_cost INTO v_src_qty, v_src_avg
      FROM stock_balances
      WHERE store_id = h.from_store_id AND product_variant_id = it.product_variant_id
      FOR UPDATE;
    IF NOT FOUND THEN
      v_src_qty := 0;
      v_src_avg := 0;
    END IF;

    v_unit_cost := COALESCE(NULLIF(it.unit_cost, 0), NULLIF(v_src_avg, 0), 0);

    IF (v_src_qty - it.qty) < 0 AND NOT v_allow_neg THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK|%', it.product_variant_id USING ERRCODE = 'P0001';
    END IF;

    -- Decrement source (upsert so an allow-negative store can go below zero)
    INSERT INTO stock_balances (tenant_id, store_id, product_variant_id, qty_on_hand, qty_available, avg_cost, last_movement_at)
      VALUES (h.tenant_id, h.from_store_id, it.product_variant_id, -it.qty, -it.qty, v_src_avg, now())
    ON CONFLICT (store_id, product_variant_id) DO UPDATE
      SET qty_on_hand      = stock_balances.qty_on_hand - it.qty,
          qty_available    = (stock_balances.qty_on_hand - it.qty) - stock_balances.qty_reserved,
          last_movement_at = now(),
          updated_at       = now();

    -- Increment destination with weighted-average cost
    INSERT INTO stock_balances (tenant_id, store_id, product_variant_id, qty_on_hand, qty_available, avg_cost, last_movement_at)
      VALUES (h.tenant_id, h.to_store_id, it.product_variant_id, it.qty, it.qty, v_unit_cost, now())
    ON CONFLICT (store_id, product_variant_id) DO UPDATE
      SET qty_on_hand   = stock_balances.qty_on_hand + it.qty,
          qty_available = (stock_balances.qty_on_hand + it.qty) - stock_balances.qty_reserved,
          avg_cost      = CASE
                            WHEN (stock_balances.qty_on_hand + it.qty) = 0 THEN stock_balances.avg_cost
                            ELSE (stock_balances.qty_on_hand * stock_balances.avg_cost + it.qty * v_unit_cost)
                                 / (stock_balances.qty_on_hand + it.qty)
                          END,
          last_movement_at = now(),
          updated_at       = now();

    -- Paired ledger rows, both linked to the transfer document
    INSERT INTO inventory_movements
      (auth_user_id, branch_id, store_id, product_variant_id, movement_type,
       reference_type, reference_id, qty_out, unit_cost, total_cost, movement_date, remarks, created_by)
      VALUES (h.tenant_id, v_from_branch, h.from_store_id, it.product_variant_id, 'transfer_out',
              'stock_transfer', p_transfer_id, it.qty, v_unit_cost, it.qty * v_unit_cost, now(), h.notes, h.received_by);

    INSERT INTO inventory_movements
      (auth_user_id, branch_id, store_id, product_variant_id, movement_type,
       reference_type, reference_id, qty_in, unit_cost, total_cost, movement_date, remarks, created_by)
      VALUES (h.tenant_id, v_to_branch, h.to_store_id, it.product_variant_id, 'transfer_in',
              'stock_transfer', p_transfer_id, it.qty, v_unit_cost, it.qty * v_unit_cost, now(), h.notes, h.received_by);

    -- Keep the denormalized aggregate on product_variants in sync
    UPDATE product_variants
      SET stock_quantity = COALESCE(
            (SELECT round(SUM(qty_on_hand)) FROM stock_balances WHERE product_variant_id = it.product_variant_id), 0)
      WHERE id = it.product_variant_id;

    v_count := v_count + 1;
  END LOOP;

  UPDATE stock_transfers
    SET status      = 'received',
        received_by = COALESCE(received_by, auth.uid()::text),
        received_at = now(),
        updated_at  = now()
    WHERE id = p_transfer_id;

  RETURN jsonb_build_object('transfer_id', p_transfer_id, 'status', 'received', 'items_applied', v_count);
END;
$$;

COMMIT;
