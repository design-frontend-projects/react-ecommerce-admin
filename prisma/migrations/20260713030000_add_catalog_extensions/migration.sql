BEGIN;



-- =============================================================================
-- Catalog extensions: brands, units of measure + conversions, multi-barcodes,
-- bundle/kit components, product typing and tracking flags.
-- =============================================================================

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'product_type_enum' AND n.nspname = 'public') THEN
    CREATE TYPE "product_type_enum" AS ENUM ('simple', 'variant', 'bundle', 'service', 'composite');
  END IF;
END $do$;



CREATE TABLE IF NOT EXISTS "brands" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "name"         VARCHAR(120) NOT NULL,
  "code"         VARCHAR(30),
  "logo_url"     TEXT,
  "description"  TEXT,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id" UUID DEFAULT auth.uid(),
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_brands_tenant_name" ON "brands" ("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "idx_brands_tenant_id" ON "brands" ("tenant_id");



CREATE TABLE IF NOT EXISTS "uoms" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "code"         VARCHAR(20) NOT NULL,
  "name"         VARCHAR(80) NOT NULL,
  "uom_category" VARCHAR(30) NOT NULL DEFAULT 'count',
  "is_base"      BOOLEAN NOT NULL DEFAULT false,
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id" UUID DEFAULT auth.uid(),
  CONSTRAINT "uoms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_uoms_tenant_code" ON "uoms" ("tenant_id", "code");

CREATE INDEX IF NOT EXISTS "idx_uoms_tenant_id" ON "uoms" ("tenant_id");



CREATE TABLE IF NOT EXISTS "unit_conversions" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID NOT NULL,
  "product_variant_id" UUID,
  "from_uom_id"        UUID NOT NULL,
  "to_uom_id"          UUID NOT NULL,
  "factor"             DECIMAL(18,6) NOT NULL,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"       UUID DEFAULT auth.uid(),
  CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unit_conversions_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "unit_conversions_from_uom_id_fkey"
    FOREIGN KEY ("from_uom_id") REFERENCES "uoms" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "unit_conversions_to_uom_id_fkey"
    FOREIGN KEY ("to_uom_id") REFERENCES "uoms" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "unit_conversions_factor_positive" CHECK ("factor" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_unit_conversions_pair"
  ON "unit_conversions" ("tenant_id", COALESCE("product_variant_id", '00000000-0000-0000-0000-000000000000'::uuid), "from_uom_id", "to_uom_id");

CREATE INDEX IF NOT EXISTS "idx_unit_conversions_tenant_id" ON "unit_conversions" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_unit_conversions_variant_id" ON "unit_conversions" ("product_variant_id");



CREATE TABLE IF NOT EXISTS "product_barcodes" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID NOT NULL,
  "product_variant_id" UUID NOT NULL,
  "barcode"            VARCHAR(64) NOT NULL,
  "barcode_type"       VARCHAR(20) NOT NULL DEFAULT 'EAN13',
  "uom_id"             UUID,
  "qty_per_scan"       DECIMAL(18,4) NOT NULL DEFAULT 1,
  "is_primary"         BOOLEAN NOT NULL DEFAULT false,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"       UUID DEFAULT auth.uid(),
  CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_barcodes_product_variant_id_fkey"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "product_barcodes_uom_id_fkey"
    FOREIGN KEY ("uom_id") REFERENCES "uoms" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_barcodes_tenant_barcode" ON "product_barcodes" ("tenant_id", "barcode");

CREATE INDEX IF NOT EXISTS "idx_product_barcodes_variant_id" ON "product_barcodes" ("product_variant_id");

CREATE INDEX IF NOT EXISTS "idx_product_barcodes_barcode" ON "product_barcodes" ("barcode");



CREATE TABLE IF NOT EXISTS "bundle_components" (
  "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            UUID NOT NULL,
  "parent_product_id"    INTEGER NOT NULL,
  "component_variant_id" UUID NOT NULL,
  "qty"                  DECIMAL(18,4) NOT NULL DEFAULT 1,
  "uom_id"               UUID,
  "sort_order"           INTEGER NOT NULL DEFAULT 0,
  "created_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "auth_user_id"         UUID DEFAULT auth.uid(),
  CONSTRAINT "bundle_components_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_components_parent_product_id_fkey"
    FOREIGN KEY ("parent_product_id") REFERENCES "products" ("product_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "bundle_components_component_variant_id_fkey"
    FOREIGN KEY ("component_variant_id") REFERENCES "product_variants" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "bundle_components_uom_id_fkey"
    FOREIGN KEY ("uom_id") REFERENCES "uoms" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "bundle_components_qty_positive" CHECK ("qty" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_bundle_components_pair" ON "bundle_components" ("parent_product_id", "component_variant_id");

CREATE INDEX IF NOT EXISTS "idx_bundle_components_tenant_id" ON "bundle_components" ("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_bundle_components_component" ON "bundle_components" ("component_variant_id");



-- Product typing + tracking flags (all additive, safe defaults)
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "product_type"      "product_type_enum" NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS "brand_id"          UUID,
  ADD COLUMN IF NOT EXISTS "base_uom_id"       UUID,
  ADD COLUMN IF NOT EXISTS "is_batch_tracked"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_serial_tracked" BOOLEAN NOT NULL DEFAULT false;



ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_brand_id_fkey", DROP CONSTRAINT IF EXISTS "products_base_uom_id_fkey";
ALTER TABLE "products"
  ADD CONSTRAINT "products_brand_id_fkey"
    FOREIGN KEY ("brand_id") REFERENCES "brands" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "products_base_uom_id_fkey"
    FOREIGN KEY ("base_uom_id") REFERENCES "uoms" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;



CREATE INDEX IF NOT EXISTS "idx_products_brand_id" ON "products" ("brand_id");



ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "uom_id" UUID;

ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_uom_id_fkey";
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_uom_id_fkey"
    FOREIGN KEY ("uom_id") REFERENCES "uoms" ("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_product_variants_uom_id" ON "product_variants" ("uom_id");



UPDATE "products" SET "product_type" = 'variant' WHERE "has_variants" = true;



-- updated_at triggers + RLS
CREATE OR REPLACE TRIGGER "trg_brands_updated_at"
BEFORE UPDATE ON "brands" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_uoms_updated_at"
BEFORE UPDATE ON "uoms" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_unit_conversions_updated_at"
BEFORE UPDATE ON "unit_conversions" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_product_barcodes_updated_at"
BEFORE UPDATE ON "product_barcodes" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();

CREATE OR REPLACE TRIGGER "trg_bundle_components_updated_at"
BEFORE UPDATE ON "bundle_components" FOR EACH ROW EXECUTE FUNCTION "inventory_set_updated_at"();



ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "uoms" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "unit_conversions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "product_barcodes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "bundle_components" ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "brands_all_own" ON "brands";
CREATE POLICY "brands_all_own" ON "brands"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "uoms_all_own" ON "uoms";
CREATE POLICY "uoms_all_own" ON "uoms"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "unit_conversions_all_own" ON "unit_conversions";
CREATE POLICY "unit_conversions_all_own" ON "unit_conversions"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "product_barcodes_all_own" ON "product_barcodes";
CREATE POLICY "product_barcodes_all_own" ON "product_barcodes"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());

DROP POLICY IF EXISTS "bundle_components_all_own" ON "bundle_components";
CREATE POLICY "bundle_components_all_own" ON "bundle_components"
  FOR ALL TO authenticated
  USING ("auth_user_id" = auth.uid()) WITH CHECK ("auth_user_id" = auth.uid());



-- Backfill primary barcodes from product_variants.barcode (dedupe per tenant,
-- keep the earliest-created variant's barcode; variants with no tenant skipped)
INSERT INTO "product_barcodes" ("tenant_id", "product_variant_id", "barcode", "is_primary", "auth_user_id")
SELECT DISTINCT ON (pv.auth_user_id, pv.barcode)
  pv.auth_user_id, pv.id, pv.barcode, true, pv.auth_user_id
FROM product_variants pv
WHERE pv.barcode IS NOT NULL AND btrim(pv.barcode) <> '' AND pv.auth_user_id IS NOT NULL
ORDER BY pv.auth_user_id, pv.barcode, pv.created_at ASC NULLS LAST;



COMMIT;
