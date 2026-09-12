-- Migration: 20260912050000_create_price_list_assignments
-- Description: Creates the price_list_assignments table to allow assigning stores, channels,
-- and customer groups to multiple price lists with priorities, date validity, and default handling.

-- 1. Create price_list_assignment_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_list_assignment_type') THEN
    CREATE TYPE "price_list_assignment_type" AS ENUM (
      'STORE',
      'CHANNEL',
      'CUSTOMER_GROUP',
      'STORE_CHANNEL',
      'STORE_CUSTOMER_GROUP',
      'CHANNEL_CUSTOMER_GROUP',
      'STORE_CHANNEL_CUSTOMER_GROUP',
      'GLOBAL'
    );
  END IF;
END $$;

-- 2. Create price_list_assignments table
CREATE TABLE IF NOT EXISTS "price_list_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "price_list_id" UUID NOT NULL,
  "store_id" UUID NULL,
  "channel_id" UUID NULL,
  "customer_group_id" UUID NULL,
  "assignment_type" "price_list_assignment_type" NOT NULL DEFAULT 'STORE',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "valid_from" TIMESTAMPTZ(6) NULL,
  "valid_to" TIMESTAMPTZ(6) NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_by_user_id" UUID NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_by_user_id" UUID NULL,
  "deleted_at" TIMESTAMPTZ(6) NULL,
  "deleted_by_user_id" UUID NULL,

  CONSTRAINT "fk_pla_price_list"
    FOREIGN KEY ("price_list_id")
    REFERENCES "price_list"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,

  CONSTRAINT "fk_pla_store"
    FOREIGN KEY ("store_id")
    REFERENCES "stores"("store_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,

  CONSTRAINT "fk_pla_channel"
    FOREIGN KEY ("channel_id")
    REFERENCES "channels"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,

  CONSTRAINT "fk_pla_customer_group"
    FOREIGN KEY ("customer_group_id")
    REFERENCES "customer_groups"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,

  CONSTRAINT "chk_pla_valid_dates"
    CHECK ("valid_to" IS NULL OR "valid_from" IS NULL OR "valid_to" > "valid_from"),

  CONSTRAINT "chk_pla_priority"
    CHECK ("priority" >= 0),

  CONSTRAINT "chk_pla_scope"
    CHECK (
      "store_id" IS NOT NULL
      OR "channel_id" IS NOT NULL
      OR "customer_group_id" IS NOT NULL
      OR "is_default" = TRUE
    )
);

-- 3. Indexes for fast resolution and tenant isolation
CREATE INDEX IF NOT EXISTS "idx_pla_tenant" ON "price_list_assignments"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pla_price_list" ON "price_list_assignments"("price_list_id");
CREATE INDEX IF NOT EXISTS "idx_pla_store" ON "price_list_assignments"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "idx_pla_channel" ON "price_list_assignments"("tenant_id", "channel_id");
CREATE INDEX IF NOT EXISTS "idx_pla_customer_group" ON "price_list_assignments"("tenant_id", "customer_group_id");
CREATE INDEX IF NOT EXISTS "idx_pla_active_priority" ON "price_list_assignments"("tenant_id", "is_active", "priority");
CREATE INDEX IF NOT EXISTS "idx_pla_price_resolution" ON "price_list_assignments"("tenant_id", "store_id", "channel_id", "customer_group_id", "is_active", "priority");

-- Prevent duplicate scope assignments for the same price list
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pla_scope"
ON "price_list_assignments" (
  "tenant_id",
  "price_list_id",
  "store_id",
  "channel_id",
  "customer_group_id"
) NULLS NOT DISTINCT;

-- Prevent identical active scope and priority collisions
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pla_active_scope_priority"
ON "price_list_assignments" (
  "tenant_id",
  "store_id",
  "channel_id",
  "customer_group_id",
  "priority"
) WHERE "is_active" = TRUE AND "deleted_at" IS NULL;

-- 4. Enable Row Level Security (RLS) and grant permissions
ALTER TABLE "price_list_assignments" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'price_list_assignments'
      AND policyname = 'tenant_isolation_price_list_assignments'
  ) THEN
    CREATE POLICY "tenant_isolation_price_list_assignments"
      ON "price_list_assignments"
      FOR ALL
      TO authenticated, service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE "price_list_assignments" TO authenticated, service_role;
GRANT SELECT ON TABLE "price_list_assignments" TO anon;

-- 5. Backfill existing price_list relations into price_list_assignments
INSERT INTO "price_list_assignments" (
  "tenant_id",
  "price_list_id",
  "store_id",
  "channel_id",
  "customer_group_id",
  "assignment_type",
  "priority",
  "is_default",
  "is_active",
  "valid_from",
  "valid_to",
  "created_at",
  "updated_at"
)
SELECT
  pl."tenant_id",
  pl."id",
  pl."store_id",
  pl."channel_id",
  pl."group_id",
  CASE
    WHEN pl."store_id" IS NOT NULL AND pl."channel_id" IS NOT NULL AND pl."group_id" IS NOT NULL THEN 'STORE_CHANNEL_CUSTOMER_GROUP'::price_list_assignment_type
    WHEN pl."store_id" IS NOT NULL AND pl."channel_id" IS NOT NULL THEN 'STORE_CHANNEL'::price_list_assignment_type
    WHEN pl."store_id" IS NOT NULL AND pl."group_id" IS NOT NULL THEN 'STORE_CUSTOMER_GROUP'::price_list_assignment_type
    WHEN pl."channel_id" IS NOT NULL AND pl."group_id" IS NOT NULL THEN 'CHANNEL_CUSTOMER_GROUP'::price_list_assignment_type
    WHEN pl."store_id" IS NOT NULL THEN 'STORE'::price_list_assignment_type
    WHEN pl."channel_id" IS NOT NULL THEN 'CHANNEL'::price_list_assignment_type
    WHEN pl."group_id" IS NOT NULL THEN 'CUSTOMER_GROUP'::price_list_assignment_type
    ELSE 'GLOBAL'::price_list_assignment_type
  END,
  100,
  COALESCE(pl."is_default", false),
  COALESCE(pl."is_active", true),
  pl."start_date",
  pl."end_date",
  COALESCE(pl."created_at", NOW()),
  COALESCE(pl."updated_at", NOW())
FROM "price_list" pl
WHERE (
  pl."store_id" IS NOT NULL
  OR pl."channel_id" IS NOT NULL
  OR pl."group_id" IS NOT NULL
  OR pl."is_default" = TRUE
)
ON CONFLICT DO NOTHING;
