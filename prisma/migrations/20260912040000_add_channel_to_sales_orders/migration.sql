-- Add channel_id to sales_orders table
ALTER TABLE "sales_orders"
ADD COLUMN IF NOT EXISTS "channel_id" UUID REFERENCES "channels"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_sales_orders_channel_id" ON "sales_orders"("channel_id");
