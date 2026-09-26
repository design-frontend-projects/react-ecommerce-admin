-- Migration: 20260926133000_refactor_stock_balances_to_inventory_items
-- Description: Refactor stock_balances to reference inventory_items(id) instead of product_variant_id directly.
--              Add inventory_item_id NOT NULL with FK to inventory_items(id) ON DELETE RESTRICT.
--              Update store_id FK to ON DELETE RESTRICT.
--              Add composite and lookup indexes, enable RLS, and add sync trigger.

BEGIN;

-- 1. Add inventory_item_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'stock_balances' 
          AND column_name = 'inventory_item_id'
    ) THEN
        ALTER TABLE public.stock_balances ADD COLUMN inventory_item_id UUID;
    END IF;
END $$;

-- 2. Backfill inventory_item_id from inventory_items
UPDATE public.stock_balances sb
SET inventory_item_id = ii.id
FROM public.inventory_items ii
WHERE sb.tenant_id = ii.tenant_id
  AND sb.product_variant_id = ii.product_variant_id
  AND sb.inventory_item_id IS NULL;

-- 3. Enforce NOT NULL on inventory_item_id
ALTER TABLE public.stock_balances ALTER COLUMN inventory_item_id SET NOT NULL;

-- 4. Foreign Key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_balances_inventory_item_id_fkey'
    ) THEN
        ALTER TABLE public.stock_balances
        ADD CONSTRAINT stock_balances_inventory_item_id_fkey
        FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id)
        ON DELETE RESTRICT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_balances_store_id_fkey'
    ) THEN
        ALTER TABLE public.stock_balances DROP CONSTRAINT stock_balances_store_id_fkey;
    END IF;
    ALTER TABLE public.stock_balances
    ADD CONSTRAINT stock_balances_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.stores(store_id)
    ON DELETE RESTRICT;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_sb_tenant_item ON public.stock_balances (tenant_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_sb_tenant_warehouse ON public.stock_balances (tenant_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sb_tenant_store ON public.stock_balances (tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_sb_tenant_location ON public.stock_balances (tenant_id, location_id);
CREATE INDEX IF NOT EXISTS idx_sb_tenant_batch ON public.stock_balances (tenant_id, batch_id);

CREATE INDEX IF NOT EXISTS idx_sb_lookup ON public.stock_balances (
  tenant_id, inventory_item_id, warehouse_id, condition
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sb_unique_position ON public.stock_balances (
  tenant_id,
  inventory_item_id,
  COALESCE(warehouse_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(location_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(store_id, '00000000-0000-0000-0000-000000000000'),
  condition,
  COALESCE(batch_id, '00000000-0000-0000-0000-000000000000')
);

-- 6. RLS Policies
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stock_balances' AND policyname = 'tenant_isolation_stock_balances_insert'
    ) THEN
        CREATE POLICY tenant_isolation_stock_balances_insert ON public.stock_balances
        FOR INSERT WITH CHECK (
            tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
            OR tenant_id = public.get_my_tenant_id()
            OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stock_balances' AND policyname = 'tenant_isolation_stock_balances_update'
    ) THEN
        CREATE POLICY tenant_isolation_stock_balances_update ON public.stock_balances
        FOR UPDATE USING (
            tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
            OR tenant_id = public.get_my_tenant_id()
            OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
        ) WITH CHECK (
            tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
            OR tenant_id = public.get_my_tenant_id()
            OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stock_balances' AND policyname = 'tenant_isolation_stock_balances_delete'
    ) THEN
        CREATE POLICY tenant_isolation_stock_balances_delete ON public.stock_balances
        FOR DELETE USING (
            tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
            OR tenant_id = public.get_my_tenant_id()
            OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
        );
    END IF;
END $$;

-- 7. Update compatibility view
CREATE OR REPLACE VIEW public.inventory AS
SELECT 
    row_number() OVER (ORDER BY ii.created_at) AS inventory_id,
    sb.store_id,
    sb.warehouse_id,
    sb.location_id AS warehouse_location_id,
    ii.created_at,
    NULL::timestamptz AS last_count_date,
    NULL::timestamptz AS last_restocked_date,
    rr.max_qty::integer AS max_quantity,
    rr.min_qty::integer AS min_quantity,
    rr.reorder_point::integer AS reorder_point,
    rr.safety_stock::integer AS safety_stock,
    rr.reorder_qty::integer AS reorder_quantity,
    rr.reorder_point::integer AS reorder_level,
    sb.avg_cost AS unit_cost,
    rr.lead_time_days AS lead_time_days,
    ii.is_active,
    ii.status,
    NULL::varchar(50) AS aisle,
    NULL::varchar(50) AS rack,
    NULL::varchar(50) AS shelf,
    NULL::varchar(50) AS bin,
    ii.notes,
    ii.tenant_id,
    ii.updated_at,
    pv.product_id,
    ii.product_variant_id,
    ii.created_by_user_id,
    ii.updated_by_user_id
FROM public.inventory_items ii
JOIN public.product_variants pv ON pv.id = ii.product_variant_id
LEFT JOIN public.stock_balances sb ON sb.inventory_item_id = ii.id
LEFT JOIN public.reorder_rules rr ON rr.product_variant_id = ii.product_variant_id;

-- 8. Bi-directional sync trigger between inventory_item_id and product_variant_id
CREATE OR REPLACE FUNCTION public.sync_stock_balance_item_variant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inventory_item_id IS NULL AND NEW.product_variant_id IS NOT NULL THEN
        SELECT id INTO NEW.inventory_item_id
        FROM public.inventory_items
        WHERE tenant_id = NEW.tenant_id AND product_variant_id = NEW.product_variant_id
        LIMIT 1;
    END IF;

    IF NEW.product_variant_id IS NULL AND NEW.inventory_item_id IS NOT NULL THEN
        SELECT product_variant_id INTO NEW.product_variant_id
        FROM public.inventory_items
        WHERE id = NEW.inventory_item_id
        LIMIT 1;
    END IF;

    NEW.qty_available := NEW.qty_on_hand - NEW.qty_reserved;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_stock_balance_item_variant ON public.stock_balances;
CREATE TRIGGER trg_sync_stock_balance_item_variant
BEFORE INSERT OR UPDATE ON public.stock_balances
FOR EACH ROW
EXECUTE FUNCTION public.sync_stock_balance_item_variant();

COMMIT;
