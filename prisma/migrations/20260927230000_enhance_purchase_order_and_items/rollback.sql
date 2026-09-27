-- =============================================================================
-- Rollback Migration: 20260927230000_enhance_purchase_order_and_items
-- =============================================================================

-- Step 1: Re-add columns to purchase_orders
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "total_amount" numeric(12, 2);
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tax_amount" numeric;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12, 2);
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'pending';

-- Populate legacy status from lifecycle_status
UPDATE "purchase_orders"
SET "status" = COALESCE("lifecycle_status"::text, 'pending'),
    "total_amount" = "grand_total",
    "tax_amount" = "tax_total",
    "discount_amount" = "discount_total";

-- Step 2: Re-add columns to purchase_order_items
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "product_id" uuid;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "has_expiration" boolean DEFAULT false;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "expiration_date" date;

-- Populate product_id from product_variants
UPDATE "purchase_order_items" poi
SET "product_id" = pv."product_id"
FROM "product_variants" pv
WHERE poi."product_variant_id" = pv."id";

ALTER TABLE "purchase_order_items" ADD CONSTRAINT "fk_purchase_order_items_products"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE NO ACTION;

-- Step 3: Reload PostgREST
NOTIFY pgrst, 'reload schema';
