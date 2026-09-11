-- AlterTable: Add country_id, city_id, phone, email to warehouses
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "country_id" UUID;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "city_id" UUID;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- AddForeignKey constraints
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warehouses_country_id_fkey'
  ) THEN
    ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_country_id_fkey"
      FOREIGN KEY ("country_id") REFERENCES "countries"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warehouses_city_id_fkey'
  ) THEN
    ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_city_id_fkey"
      FOREIGN KEY ("city_id") REFERENCES "cities"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_warehouses_country_id" ON "warehouses"("country_id");
CREATE INDEX IF NOT EXISTS "idx_warehouses_city_id" ON "warehouses"("city_id");
