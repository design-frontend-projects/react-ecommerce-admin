-- Migration: 20260925220000_rename_inventory_to_inventory_items
-- Description: Refactor inventory into normalized inventory_items master model with UUID PK,
--              tenant isolation, 1:1 variant constraint, RLS, and reorder_rules integration.

BEGIN;

-- 1. Ensure composite unique constraint on product_variants for composite foreign key references
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_tenant_id_id_key'
    ) THEN
        ALTER TABLE "public"."product_variants" 
        ADD CONSTRAINT "product_variants_tenant_id_id_key" UNIQUE ("tenant_id", "id");
    END IF;
END $$;

-- 2. Drop existing views and old inventory table if exists
DROP VIEW IF EXISTS "public"."inventory" CASCADE;

-- Backfill reorder parameters into reorder_rules before dropping old table (if inventory_items has old columns)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'reorder_point'
    ) THEN
        INSERT INTO "public"."reorder_rules" (
            "id",
            "tenant_id",
            "product_variant_id",
            "warehouse_id",
            "store_id",
            "min_qty",
            "max_qty",
            "safety_stock",
            "reorder_point",
            "reorder_qty",
            "lead_time_days",
            "is_active",
            "created_at",
            "updated_at",
            "created_by_user_id",
            "updated_by_user_id"
        )
        SELECT
            gen_random_uuid(),
            b.tenant_id,
            b.product_variant_id,
            b.warehouse_id,
            b.store_id,
            b.min_quantity,
            b.max_quantity,
            COALESCE(b.safety_stock, 0),
            COALESCE(b.reorder_point, 0),
            COALESCE(b.reorder_quantity, 0),
            COALESCE(b.lead_time_days, 1),
            COALESCE(b.is_active, true),
            COALESCE(b.created_at, CURRENT_TIMESTAMP),
            COALESCE(b.updated_at, CURRENT_TIMESTAMP),
            b.created_by_user_id,
            b.updated_by_user_id
        FROM "public"."inventory_items" b
        WHERE b.product_variant_id IS NOT NULL
          AND (b.reorder_point > 0 OR b.min_quantity > 0 OR b.reorder_quantity > 0)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

DROP TABLE IF EXISTS "public"."inventory_items" CASCADE;

-- 3. Create target inventory_items table
CREATE TABLE "public"."inventory_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "barcode" VARCHAR(100),
    "is_stockable" BOOLEAN NOT NULL DEFAULT true,
    "is_sellable" BOOLEAN NOT NULL DEFAULT true,
    "is_purchasable" BOOLEAN NOT NULL DEFAULT true,
    "tracking_type" VARCHAR(20) NOT NULL DEFAULT 'NONE',
    "unit_of_measure_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_items_tenant_variant_fkey" FOREIGN KEY ("tenant_id", "product_variant_id")
        REFERENCES "public"."product_variants"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "inventory_items_uom_fkey" FOREIGN KEY ("unit_of_measure_id")
        REFERENCES "public"."uoms"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- 4. Enforce tenant-scoped constraints & indexes
ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_tenant_variant_uk" UNIQUE ("tenant_id", "product_variant_id");
ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_tenant_sku_uk" UNIQUE ("tenant_id", "sku");

CREATE INDEX "idx_inventory_items_tenant_id" ON "public"."inventory_items"("tenant_id");
CREATE INDEX "idx_inventory_items_tenant_variant" ON "public"."inventory_items"("tenant_id", "product_variant_id");
CREATE INDEX "idx_inventory_items_tenant_sku" ON "public"."inventory_items"("tenant_id", "sku");
CREATE INDEX "idx_inventory_items_tenant_status" ON "public"."inventory_items"("tenant_id", "status");
CREATE INDEX "idx_inventory_items_tenant_tracking" ON "public"."inventory_items"("tenant_id", "tracking_type");
CREATE INDEX "idx_inventory_items_tenant_active" ON "public"."inventory_items"("tenant_id", "is_active");

-- Partial unique index for barcodes per tenant (allows NULL barcodes)
CREATE UNIQUE INDEX "idx_inventory_items_tenant_barcode" 
ON "public"."inventory_items"("tenant_id", "barcode") 
WHERE ("barcode" IS NOT NULL AND "barcode" <> '');

-- 5. Seed clean inventory_items from product_variants and products master catalog
INSERT INTO "public"."inventory_items" (
    "id",
    "tenant_id",
    "product_variant_id",
    "sku",
    "barcode",
    "is_stockable",
    "is_sellable",
    "is_purchasable",
    "tracking_type",
    "unit_of_measure_id",
    "status",
    "is_active",
    "notes",
    "created_at",
    "updated_at",
    "created_by_user_id",
    "updated_by_user_id"
)
SELECT
    gen_random_uuid(),
    pv.tenant_id,
    pv.id AS product_variant_id,
    pv.sku,
    pv.barcode,
    COALESCE(p.is_stock_item, true) AS is_stockable,
    true AS is_sellable,
    COALESCE(p.reorderable, true) AS is_purchasable,
    CASE 
        WHEN p.is_batch_tracked AND p.is_serial_tracked THEN 'LOT_AND_SERIAL'
        WHEN p.is_serial_tracked OR p.tracking_mode = 'serial' THEN 'SERIAL'
        WHEN p.is_batch_tracked OR p.tracking_mode = 'batch' THEN 'LOT'
        ELSE 'NONE'
    END AS tracking_type,
    COALESCE(pv.uom_id, p.base_uom_id) AS unit_of_measure_id,
    CASE WHEN pv.is_active = false THEN 'INACTIVE' ELSE 'ACTIVE' END AS status,
    COALESCE(pv.is_active, true) AS is_active,
    NULL AS notes,
    COALESCE(pv.created_at, CURRENT_TIMESTAMP),
    COALESCE(pv.updated_at, CURRENT_TIMESTAMP),
    pv.created_by_user_id,
    pv.updated_by_user_id
FROM "public"."product_variants" pv
JOIN "public"."products" p ON p.id = pv.product_id
ON CONFLICT ("tenant_id", "product_variant_id") DO NOTHING;

-- 6. Helper function for tenant resolution
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(tenant_id, parent_tenant_id)
  FROM public.tenant_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. Enable Row Level Security (RLS) & Policies
ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_inventory_items_select" ON "public"."inventory_items"
FOR SELECT USING (
    tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
    OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL)
    OR tenant_id = public.get_my_tenant_id()
);

CREATE POLICY "tenant_isolation_inventory_items_insert" ON "public"."inventory_items"
FOR INSERT WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
    OR tenant_id = public.get_my_tenant_id()
    OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
);

CREATE POLICY "tenant_isolation_inventory_items_update" ON "public"."inventory_items"
FOR UPDATE USING (
    tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
    OR tenant_id = public.get_my_tenant_id()
    OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
) WITH CHECK (
    tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
    OR tenant_id = public.get_my_tenant_id()
    OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
);

CREATE POLICY "tenant_isolation_inventory_items_delete" ON "public"."inventory_items"
FOR DELETE USING (
    tenant_id = (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text))::uuid
    OR tenant_id = public.get_my_tenant_id()
    OR (NULLIF(current_setting('app.current_tenant_id'::text, true), ''::text) IS NULL AND auth.uid() IS NULL)
);

-- 8. Compatibility view for legacy readers
CREATE OR REPLACE VIEW "public"."inventory" AS
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
FROM "public"."inventory_items" ii
JOIN "public"."product_variants" pv ON pv.id = ii.product_variant_id
LEFT JOIN "public"."stock_balances" sb ON sb.product_variant_id = ii.product_variant_id
LEFT JOIN "public"."reorder_rules" rr ON rr.product_variant_id = ii.product_variant_id;

COMMIT;
