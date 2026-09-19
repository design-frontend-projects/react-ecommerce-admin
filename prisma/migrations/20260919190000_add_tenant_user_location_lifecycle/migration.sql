-- Add Location / ABAC attribute columns to tenant_users
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "country_id" UUID;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "city_id" UUID;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "store_id" UUID;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "warehouse_id" UUID;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "channel_id" UUID;

-- Add User lifecycle columns to tenant_users
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "is_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMPTZ(6);
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "blocked_by" UUID;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "deleted_by" UUID;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ(6);
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ(6);

-- Add Foreign Key constraints
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "countries"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_city_id_fkey"
  FOREIGN KEY ("city_id") REFERENCES "cities"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("store_id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "channels"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS "idx_tenant_users_tenant_active"
  ON "tenant_users" ("tenant_id", "is_active");

CREATE INDEX IF NOT EXISTS "idx_tenant_users_email"
  ON "tenant_users" ("email");
