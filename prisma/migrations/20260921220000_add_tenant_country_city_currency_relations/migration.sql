-- ============================================================
-- Enhance Tenant Relationships: Country, City, Currency
-- ============================================================

-- 1. Add city_id to tenants table if not exists
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "city_id" UUID;

-- 2. Add Foreign Key Constraint for tenants -> cities
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tenants_city_id_fkey'
    ) THEN
        ALTER TABLE "tenants" ADD CONSTRAINT "tenants_city_id_fkey"
            FOREIGN KEY ("city_id") REFERENCES "cities"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

-- 3. Add Performance Indexes for Relational Lookups
CREATE INDEX IF NOT EXISTS "idx_tenants_city_id" ON "tenants"("city_id");
CREATE INDEX IF NOT EXISTS "idx_tenants_country_id" ON "tenants"("country_id");
CREATE INDEX IF NOT EXISTS "idx_tenants_currency_id" ON "tenants"("currency_id");
