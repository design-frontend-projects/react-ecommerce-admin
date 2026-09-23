-- AlterTable: Add has_expiration and expiration_date to purchase_order_items
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "has_expiration" BOOLEAN DEFAULT false;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "expiration_date" DATE;
