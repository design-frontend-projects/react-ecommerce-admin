-- CreateTable: channels
CREATE TABLE "channels" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          UUID NOT NULL,
  "code"               VARCHAR(50) NOT NULL,
  "name"               VARCHAR(150) NOT NULL,
  "name_ar"            VARCHAR(150),
  "description"        TEXT,
  "is_active"          BOOLEAN NOT NULL DEFAULT true,
  "created_at"         TIMESTAMPTZ(6) DEFAULT NOW(),
  "updated_at"         TIMESTAMPTZ(6) DEFAULT NOW(),
  "created_by_user_id" UUID,
  "updated_by_user_id" UUID,
  CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- Unique index: tenant_id + code
CREATE UNIQUE INDEX "channels_tenant_id_code_key" ON "channels" ("tenant_id", "code");

-- Index: tenant_id for RLS / tenant queries
CREATE INDEX "channels_tenant_id_idx" ON "channels" ("tenant_id");

-- AlterTable: price_list — add currency_id and channel_id
ALTER TABLE "price_list" ADD COLUMN "currency_id" UUID;
ALTER TABLE "price_list" ADD COLUMN "channel_id" UUID;

-- AddForeignKey: price_list.currency_id → currencies.id
ALTER TABLE "price_list"
  ADD CONSTRAINT "price_list_currency_id_fkey"
  FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey: price_list.channel_id → channels.id
ALTER TABLE "price_list"
  ADD CONSTRAINT "price_list_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey: sales_invoices.channel_id → channels.id (was orphan)
ALTER TABLE "sales_invoices"
  ADD CONSTRAINT "sales_invoices_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Indexes for new FKs
CREATE INDEX "price_list_currency_id_idx" ON "price_list" ("currency_id");
CREATE INDEX "price_list_channel_id_idx" ON "price_list" ("channel_id");

-- Enable Row Level Security (RLS) on channels
ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Policy with security definer functions"
  ON "channels"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table grants
GRANT ALL ON TABLE "channels" TO authenticated, service_role;
GRANT SELECT ON TABLE "channels" TO anon;

