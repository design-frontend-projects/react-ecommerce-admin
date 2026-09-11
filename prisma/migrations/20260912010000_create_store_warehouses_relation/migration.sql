-- CreateTable: store_warehouses
CREATE TABLE IF NOT EXISTS "store_warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "allow_fulfillment" BOOLEAN NOT NULL DEFAULT true,
    "allow_replenishment" BOOLEAN NOT NULL DEFAULT true,
    "allow_returns" BOOLEAN NOT NULL DEFAULT true,
    "lead_time_days" INTEGER DEFAULT 1,
    "distance_km" DECIMAL(10,2),
    "transit_cost" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,

    CONSTRAINT "store_warehouses_pkey" PRIMARY KEY ("id")
);

-- Backfill from legacy warehouses.store_id before dropping column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'warehouses' 
          AND column_name = 'store_id'
    ) THEN
        INSERT INTO "store_warehouses" (
            "tenant_id", "store_id", "warehouse_id", "is_default", "priority",
            "allow_fulfillment", "allow_replenishment", "allow_returns", "lead_time_days",
            "is_active", "created_at", "updated_at"
        )
        SELECT
            w."tenant_id", w."store_id", w."id", true, 1,
            true, true, true, 1,
            true, NOW(), NOW()
        FROM "warehouses" w
        WHERE w."store_id" IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Drop foreign key and column store_id from warehouses to remove direct relation
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
          AND constraint_name = 'warehouses_store_id_fkey'
    ) THEN
        ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_store_id_fkey";
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'warehouses' 
          AND column_name = 'store_id'
    ) THEN
        ALTER TABLE "warehouses" DROP COLUMN "store_id";
    END IF;
END $$;

-- Drop old index if exists
DROP INDEX IF EXISTS "warehouses_store_id_idx";

-- Unique constraint on (store_id, warehouse_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'store_warehouses_store_warehouse_unique'
    ) THEN
        ALTER TABLE "store_warehouses" 
            ADD CONSTRAINT "store_warehouses_store_warehouse_unique" 
            UNIQUE ("store_id", "warehouse_id");
    END IF;
END $$;

-- Foreign Keys for store_warehouses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'store_warehouses_store_id_fkey'
    ) THEN
        ALTER TABLE "store_warehouses"
            ADD CONSTRAINT "store_warehouses_store_id_fkey"
            FOREIGN KEY ("store_id") REFERENCES "stores"("store_id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'store_warehouses_warehouse_id_fkey'
    ) THEN
        ALTER TABLE "store_warehouses"
            ADD CONSTRAINT "store_warehouses_warehouse_id_fkey"
            FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

-- Indexes for performance and multi-tenant queries
CREATE INDEX IF NOT EXISTS "idx_store_warehouses_tenant_id" ON "store_warehouses"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_store_warehouses_store_id" ON "store_warehouses"("store_id");
CREATE INDEX IF NOT EXISTS "idx_store_warehouses_warehouse_id" ON "store_warehouses"("warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_store_warehouses_store_default" ON "store_warehouses"("store_id", "is_default");
CREATE INDEX IF NOT EXISTS "idx_store_warehouses_store_priority" ON "store_warehouses"("store_id", "priority");
CREATE INDEX IF NOT EXISTS "idx_store_warehouses_is_active" ON "store_warehouses"("is_active");

-- Row Level Security (RLS)
ALTER TABLE "store_warehouses" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'store_warehouses' 
          AND policyname = 'tenant_isolation_store_warehouses'
    ) THEN
        CREATE POLICY "tenant_isolation_store_warehouses" ON "store_warehouses"
            FOR ALL
            USING (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
            );
    END IF;
END $$;
