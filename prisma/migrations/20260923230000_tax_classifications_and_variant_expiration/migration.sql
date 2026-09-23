-- CreateTable
CREATE TABLE IF NOT EXISTS "tax_classifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100),
    "rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tax_classifications_code_key" ON "tax_classifications"("code");

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "expiration_date" DATE;

-- Migrate existing expiration_date to variants if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'expiration_date'
    ) THEN
        UPDATE "product_variants" pv
        SET "expiration_date" = p.expiration_date
        FROM "products" p
        WHERE pv.product_id = p.id AND pv.expiration_date IS NULL AND p.expiration_date IS NOT NULL;
    END IF;
END $$;

-- AlterTable products: drop reorder_level and expiration_date
ALTER TABLE "products" DROP COLUMN IF EXISTS "reorder_level";
ALTER TABLE "products" DROP COLUMN IF EXISTS "expiration_date";

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_tax_classification'
    ) THEN
        ALTER TABLE "products" ADD CONSTRAINT "fk_products_tax_classification" FOREIGN KEY ("tax_classification_id") REFERENCES "tax_classifications"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;
