-- 1. Add tax_rate_id column to product_variants
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "tax_rate_id" UUID;

-- 2. Migrate existing product tax classifications to variants where possible
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'tax_classification_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_classifications'
    ) THEN
        UPDATE "product_variants" pv
        SET "tax_rate_id" = tr.id
        FROM "products" p
        JOIN "tax_classifications" tc ON p.tax_classification_id = tc.id
        JOIN "tax_rates" tr ON tr.tenant_id = p.tenant_id AND tr.rate = tc.rate AND tr.is_active = true
        WHERE pv.product_id = p.id AND pv.tax_rate_id IS NULL;
    END IF;
END $$;

-- 3. Drop foreign key constraint on products if exists
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "fk_products_tax_classification";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_tax_classification_id_fkey";

-- 4. Drop columns tax_code and tax_classification_id from products
ALTER TABLE "products" DROP COLUMN IF EXISTS "tax_code";
ALTER TABLE "products" DROP COLUMN IF EXISTS "tax_classification_id";

-- 5. Drop tax_classifications table
DROP TABLE IF EXISTS "tax_classifications" CASCADE;

-- 6. Add foreign key from product_variants to tax_rates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_product_variants_tax_rate'
    ) THEN
        ALTER TABLE "product_variants" 
        ADD CONSTRAINT "fk_product_variants_tax_rate" 
        FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- 7. Create index on product_variants(tax_rate_id)
CREATE INDEX IF NOT EXISTS "idx_product_variants_tax_rate" ON "product_variants"("tax_rate_id");
