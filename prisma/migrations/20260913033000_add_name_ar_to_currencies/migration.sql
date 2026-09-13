-- Migration: 20260913033000_add_name_ar_to_currencies
-- Description: Add name_ar Arabic name column, widen symbol column to 10 chars, and add index on name_ar

DO $$
BEGIN
    -- 1. Add name_ar column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currencies' AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE "public"."currencies" ADD COLUMN "name_ar" VARCHAR(100);
    END IF;

    -- 2. Alter symbol column to VARCHAR(10) to support longer symbols (e.g. US$, KSh)
    ALTER TABLE "public"."currencies" ALTER COLUMN "symbol" TYPE VARCHAR(10);

    -- 3. Ensure code has unique index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'currencies' AND indexname = 'currencies_code_key'
    ) THEN
        CREATE UNIQUE INDEX "currencies_code_key" ON "public"."currencies"("code");
    END IF;

    -- 4. Create index on name_ar for fast search
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'currencies' AND indexname = 'idx_currencies_name_ar'
    ) THEN
        CREATE INDEX "idx_currencies_name_ar" ON "public"."currencies"("name_ar");
    END IF;
END $$;
