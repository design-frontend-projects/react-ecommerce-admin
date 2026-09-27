-- ============================================================================
-- Migration: Enhance Product Module (Phase 1 — Additive)
-- Date: 2026-09-28
-- Description: Non-breaking additive changes to the products module.
--   1. Adds product_code, name_ar, short_description to products
--   2. Creates product_suppliers junction table (multi-supplier)
--   3. Creates attribute_definitions, attribute_values, product_variant_attributes
--   4. Creates product_media table
--   5. Creates attribute_data_type_enum
-- ============================================================================

-- ─── 1. Add new columns to products ──────────────────────────────────────────

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "product_code" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "name_ar" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "short_description" VARCHAR(500);

-- Tenant-scoped unique index on product_code (partial: only non-null codes)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_products_tenant_product_code"
  ON "products" ("tenant_id", "product_code")
  WHERE "product_code" IS NOT NULL;

-- Index for searching by product_code
CREATE INDEX IF NOT EXISTS "idx_products_product_code"
  ON "products" ("product_code")
  WHERE "product_code" IS NOT NULL;

-- Index for searching by name_ar
CREATE INDEX IF NOT EXISTS "idx_products_name_ar"
  ON "products" ("name_ar")
  WHERE "name_ar" IS NOT NULL;

-- ─── 2. Backfill product_code from existing SKU ─────────────────────────────

-- Generate product_code for existing products that don't have one
-- Uses SKU as a starting point if available, otherwise generates PRD-XXXXXX
WITH numbered_products AS (
  SELECT
    id,
    CASE
      WHEN sku IS NOT NULL AND sku != '' THEN sku
      ELSE 'PRD-' || LPAD((ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at))::TEXT, 6, '0')
    END AS generated_code
  FROM "products"
  WHERE "product_code" IS NULL
)
UPDATE "products" p
SET "product_code" = np.generated_code
FROM numbered_products np
WHERE p.id = np.id;

-- ─── 3. Create attribute_data_type_enum ─────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "attribute_data_type_enum" AS ENUM (
    'text', 'number', 'boolean', 'color', 'select'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. Create attribute_definitions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "attribute_definitions" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID NOT NULL,
  "code"       VARCHAR(50) NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "name_ar"    VARCHAR(100),
  "data_type"  "attribute_data_type_enum" NOT NULL DEFAULT 'text',
  "sort_order" INT NOT NULL DEFAULT 0,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,

  CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_attribute_definitions_tenant_code"
  ON "attribute_definitions" ("tenant_id", "code");

CREATE INDEX IF NOT EXISTS "idx_attribute_definitions_tenant"
  ON "attribute_definitions" ("tenant_id", "is_active");

-- ─── 5. Create attribute_values ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "attribute_values" (
  "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               UUID NOT NULL,
  "attribute_definition_id" UUID NOT NULL,
  "value"                   VARCHAR(200) NOT NULL,
  "value_ar"                VARCHAR(200),
  "color_hex"               VARCHAR(10),
  "sort_order"              INT NOT NULL DEFAULT 0,
  "is_active"               BOOLEAN NOT NULL DEFAULT true,
  "created_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by_user_id"      UUID,

  CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_attribute_values_definition"
    FOREIGN KEY ("attribute_definition_id")
    REFERENCES "attribute_definitions" ("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_attribute_values_definition"
  ON "attribute_values" ("attribute_definition_id", "is_active");

CREATE INDEX IF NOT EXISTS "idx_attribute_values_tenant"
  ON "attribute_values" ("tenant_id");

-- ─── 6. Create product_variant_attributes ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "product_variant_attributes" (
  "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               UUID NOT NULL,
  "product_variant_id"      UUID NOT NULL,
  "attribute_definition_id" UUID NOT NULL,
  "attribute_value_id"      UUID NOT NULL,

  CONSTRAINT "product_variant_attributes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_pva_variant"
    FOREIGN KEY ("product_variant_id")
    REFERENCES "product_variants" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_pva_definition"
    FOREIGN KEY ("attribute_definition_id")
    REFERENCES "attribute_definitions" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_pva_value"
    FOREIGN KEY ("attribute_value_id")
    REFERENCES "attribute_values" ("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_pva_variant_attribute"
  ON "product_variant_attributes" ("product_variant_id", "attribute_definition_id");

CREATE INDEX IF NOT EXISTS "idx_pva_tenant"
  ON "product_variant_attributes" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_pva_variant"
  ON "product_variant_attributes" ("product_variant_id");

-- ─── 7. Create product_suppliers junction ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "product_suppliers" (
  "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID NOT NULL,
  "product_id"            UUID NOT NULL,
  "product_variant_id"    UUID,
  "supplier_id"           UUID NOT NULL,
  "supplier_product_code" VARCHAR(100),
  "supplier_barcode"      VARCHAR(100),
  "purchase_uom_id"       UUID,
  "minimum_order_qty"     DECIMAL(18, 4) DEFAULT 0,
  "lead_time_days"        INT DEFAULT 0,
  "unit_cost"             DECIMAL(18, 4) DEFAULT 0,
  "is_preferred"          BOOLEAN NOT NULL DEFAULT false,
  "is_active"             BOOLEAN NOT NULL DEFAULT true,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by_user_id"    UUID,
  "updated_by_user_id"    UUID,

  CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_product_suppliers_product"
    FOREIGN KEY ("product_id")
    REFERENCES "products" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_suppliers_variant"
    FOREIGN KEY ("product_variant_id")
    REFERENCES "product_variants" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_product_suppliers_supplier"
    FOREIGN KEY ("supplier_id")
    REFERENCES "suppliers" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_suppliers_uom"
    FOREIGN KEY ("purchase_uom_id")
    REFERENCES "uoms" ("id")
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_suppliers_tenant_product_supplier"
  ON "product_suppliers" ("tenant_id", "product_id", "supplier_id")
  WHERE "product_variant_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_suppliers_tenant_variant_supplier"
  ON "product_suppliers" ("tenant_id", "product_variant_id", "supplier_id")
  WHERE "product_variant_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_product_suppliers_tenant"
  ON "product_suppliers" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_product_suppliers_product"
  ON "product_suppliers" ("product_id");

CREATE INDEX IF NOT EXISTS "idx_product_suppliers_supplier"
  ON "product_suppliers" ("supplier_id");

-- ─── 8. Migrate existing supplier_id to product_suppliers ───────────────────

INSERT INTO "product_suppliers" (
  "tenant_id", "product_id", "supplier_id", "is_preferred", "is_active",
  "created_at", "updated_at", "created_by_user_id"
)
SELECT
  p."tenant_id",
  p."id",
  p."supplier_id",
  true,
  true,
  COALESCE(p."created_at", now()),
  COALESCE(p."updated_at", now()),
  p."created_by_user_id"
FROM "products" p
WHERE p."supplier_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── 9. Create product_media ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "product_media" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID NOT NULL,
  "product_id"         UUID NOT NULL,
  "variant_id"         UUID,
  "storage_path"       VARCHAR(500) NOT NULL,
  "file_name"          VARCHAR(255) NOT NULL,
  "mime_type"          VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  "file_size"          BIGINT,
  "alt_text"           VARCHAR(255),
  "sort_order"         INT NOT NULL DEFAULT 0,
  "is_primary"         BOOLEAN NOT NULL DEFAULT false,
  "is_active"          BOOLEAN NOT NULL DEFAULT true,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_by_user_id" UUID,

  CONSTRAINT "product_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_product_media_product"
    FOREIGN KEY ("product_id")
    REFERENCES "products" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_media_variant"
    FOREIGN KEY ("variant_id")
    REFERENCES "product_variants" ("id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_product_media_tenant"
  ON "product_media" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_product_media_product"
  ON "product_media" ("product_id", "sort_order");

-- ─── 10. Add performance indexes to products ────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_products_tenant_id"
  ON "products" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_products_tenant_active"
  ON "products" ("tenant_id", "is_active")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_products_tenant_category"
  ON "products" ("tenant_id", "category_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_products_tenant_brand"
  ON "products" ("tenant_id", "brand_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_products_tenant_product_type"
  ON "products" ("tenant_id", "product_type_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_products_tenant_created"
  ON "products" ("tenant_id", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

-- ─── 11. Auto-generate product_code function ────────────────────────────────

CREATE OR REPLACE FUNCTION generate_product_code(p_tenant_id UUID)
RETURNS VARCHAR(30) AS $$
DECLARE
  next_seq INT;
  new_code VARCHAR(30);
BEGIN
  SELECT COALESCE(MAX(
    CASE
      WHEN product_code ~ '^PRD-[0-9]+$'
      THEN CAST(SUBSTRING(product_code FROM 5) AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO next_seq
  FROM products
  WHERE tenant_id = p_tenant_id;

  new_code := 'PRD-' || LPAD(next_seq::TEXT, 6, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ─── 12. RLS Policies for new tables ────────────────────────────────────────

-- Enable RLS
ALTER TABLE "product_suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attribute_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attribute_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variant_attributes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_media" ENABLE ROW LEVEL SECURITY;

-- RLS policies (select = tenant-scoped, all ops for service role)
DO $$ BEGIN
  -- product_suppliers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_suppliers_tenant_select') THEN
    EXECUTE 'CREATE POLICY "product_suppliers_tenant_select" ON "product_suppliers" FOR SELECT USING (tenant_id = auth.jwt() ->> ''tenant_id''::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_suppliers_service_all') THEN
    EXECUTE 'CREATE POLICY "product_suppliers_service_all" ON "product_suppliers" FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  -- attribute_definitions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attribute_definitions_tenant_select') THEN
    EXECUTE 'CREATE POLICY "attribute_definitions_tenant_select" ON "attribute_definitions" FOR SELECT USING (tenant_id = auth.jwt() ->> ''tenant_id''::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attribute_definitions_service_all') THEN
    EXECUTE 'CREATE POLICY "attribute_definitions_service_all" ON "attribute_definitions" FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  -- attribute_values
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attribute_values_tenant_select') THEN
    EXECUTE 'CREATE POLICY "attribute_values_tenant_select" ON "attribute_values" FOR SELECT USING (tenant_id = auth.jwt() ->> ''tenant_id''::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attribute_values_service_all') THEN
    EXECUTE 'CREATE POLICY "attribute_values_service_all" ON "attribute_values" FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  -- product_variant_attributes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_variant_attributes_tenant_select') THEN
    EXECUTE 'CREATE POLICY "product_variant_attributes_tenant_select" ON "product_variant_attributes" FOR SELECT USING (tenant_id = auth.jwt() ->> ''tenant_id''::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_variant_attributes_service_all') THEN
    EXECUTE 'CREATE POLICY "product_variant_attributes_service_all" ON "product_variant_attributes" FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  -- product_media
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_media_tenant_select') THEN
    EXECUTE 'CREATE POLICY "product_media_tenant_select" ON "product_media" FOR SELECT USING (tenant_id = auth.jwt() ->> ''tenant_id''::text)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product_media_service_all') THEN
    EXECUTE 'CREATE POLICY "product_media_service_all" ON "product_media" FOR ALL USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    -- auth.jwt() not available outside Supabase context, skip policies
    RAISE NOTICE 'Skipping RLS policies: auth.jwt() not available';
END $$;
