-- Migration: 20260909020000_decouple_price_and_stock
-- Description: Decouple price and quantity from products and product_variants.
-- Price lists now act as strategy headers, prices live in price_list_items, and quantity is tracked in inventory / stock_balances.

-- 1. Alter price_list: Add name, code, is_default, created_at, updated_at; make product_id and price nullable
ALTER TABLE "price_list" ADD COLUMN IF NOT EXISTS "name" VARCHAR(150);
ALTER TABLE "price_list" ADD COLUMN IF NOT EXISTS "code" VARCHAR(50);
ALTER TABLE "price_list" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "price_list" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) DEFAULT NOW();
ALTER TABLE "price_list" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT NOW();
ALTER TABLE "price_list" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "price_list" ALTER COLUMN "price" DROP NOT NULL;

-- 2. Backfill names and default for existing price lists
UPDATE "price_list" 
SET "name" = COALESCE("name", 'Price List (' || COALESCE("type"::text, 'General') || ')'),
    "code" = COALESCE("code", UPPER(COALESCE("type"::text, 'GENERAL')))
WHERE "name" IS NULL;

-- Mark first active price list per tenant as default if none is default
WITH ranked_pl AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY start_date ASC, id ASC) as rn
  FROM "price_list"
  WHERE is_active = true
)
UPDATE "price_list"
SET is_default = true
WHERE id IN (SELECT id FROM ranked_pl WHERE rn = 1)
  AND NOT EXISTS (SELECT 1 FROM "price_list" pl2 WHERE pl2.tenant_id = "price_list".tenant_id AND pl2.is_default = true);

-- 3. Enhance price_list_items: Add product_id and cost_price
ALTER TABLE "price_list_items" ADD COLUMN IF NOT EXISTS "product_id" UUID;
ALTER TABLE "price_list_items" ADD COLUMN IF NOT EXISTS "cost_price" DECIMAL(18,4) DEFAULT 0;

-- Backfill product_id in price_list_items from product_variants
UPDATE "price_list_items" pli
SET "product_id" = pv.product_id
FROM "product_variants" pv
WHERE pli.product_variant_id = pv.id AND pli.product_id IS NULL;

-- Add foreign key constraint for product_id on price_list_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_list_items_product_id_fkey'
  ) THEN
    ALTER TABLE "price_list_items"
      ADD CONSTRAINT "price_list_items_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "price_list_items_product_id_idx" ON "price_list_items"("product_id");

-- Ensure unique constraint on (price_list_id, product_variant_id)
CREATE UNIQUE INDEX IF NOT EXISTS "price_list_items_price_list_id_product_variant_id_key" 
ON "price_list_items"("price_list_id", "product_variant_id");

-- 4. Alter product_variants: make price nullable
ALTER TABLE "product_variants" ALTER COLUMN "price" DROP NOT NULL;

-- 5. Seed stock_balances from variant stock_quantity if not already seeded
INSERT INTO "stock_balances" (
  "id", "tenant_id", "warehouse_id", "product_variant_id", "condition",
  "qty_on_hand", "qty_reserved", "qty_available", "avg_cost", "created_at", "updated_at"
)
SELECT 
  gen_random_uuid(),
  pv.tenant_id,
  (SELECT id FROM warehouses WHERE tenant_id = pv.tenant_id LIMIT 1),
  pv.id,
  'good'::stock_condition_enum,
  COALESCE(pv.stock_quantity, 0),
  0,
  COALESCE(pv.stock_quantity, 0),
  COALESCE(pv.cost_price, 0),
  NOW(),
  NOW()
FROM product_variants pv
WHERE NOT EXISTS (
  SELECT 1 FROM stock_balances sb WHERE sb.product_variant_id = pv.id
);
