-- AlterTable: price_list
ALTER TABLE "price_list" 
  ADD COLUMN IF NOT EXISTS "tax_id" UUID REFERENCES "tax_rates"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "price_source" VARCHAR(50) DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "markup_percent" DECIMAL(7, 4) DEFAULT 0;

-- AlterTable: price_list_items
ALTER TABLE "price_list_items" 
  ADD COLUMN IF NOT EXISTS "tax_id" UUID REFERENCES "tax_rates"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "price_source" VARCHAR(50) DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "markup_percent" DECIMAL(7, 4) DEFAULT 0;

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "idx_price_list_tax_id" ON "price_list"("tax_id");
CREATE INDEX IF NOT EXISTS "idx_price_list_items_tax_id" ON "price_list_items"("tax_id");
