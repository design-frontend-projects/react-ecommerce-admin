-- RBAC Module Enhancement (feature 024) — ADDITIVE migration.
-- See specs/024-rbac-enhancements/data-model.md.
-- Adds the screen/module registry, permission buttons, per-user overrides,
-- and tenant activity types. No existing columns are altered or dropped.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "business_activity_types" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "code"        varchar(50)  NOT NULL,
  "name"        varchar(100) NOT NULL,
  "description" varchar(255),
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamptz(6) DEFAULT now(),
  "updated_at"  timestamptz(6) DEFAULT now(),
  CONSTRAINT "business_activity_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_activity_types_code_key" ON "business_activity_types" ("code");

CREATE TABLE "app_modules" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "code"        varchar(50)  NOT NULL,
  "name"        varchar(100) NOT NULL,
  "description" varchar(255),
  "sort_order"  integer NOT NULL DEFAULT 0,
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamptz(6) DEFAULT now(),
  "updated_at"  timestamptz(6) DEFAULT now(),
  CONSTRAINT "app_modules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "app_modules_code_key" ON "app_modules" ("code");

CREATE TABLE "tenant_activity_types" (
  "tenant_id"        uuid NOT NULL,
  "activity_type_id" uuid NOT NULL,
  "is_active"        boolean NOT NULL DEFAULT true,
  "created_at"       timestamptz(6) DEFAULT now(),
  "updated_at"       timestamptz(6) DEFAULT now(),
  CONSTRAINT "tenant_activity_types_pkey" PRIMARY KEY ("tenant_id", "activity_type_id")
);
CREATE INDEX "idx_tenant_activity_types_activity" ON "tenant_activity_types" ("activity_type_id");

CREATE TABLE "module_activity_types" (
  "module_id"        uuid NOT NULL,
  "activity_type_id" uuid NOT NULL,
  "created_at"       timestamptz(6) DEFAULT now(),
  CONSTRAINT "module_activity_types_pkey" PRIMARY KEY ("module_id", "activity_type_id")
);
CREATE INDEX "idx_module_activity_types_activity" ON "module_activity_types" ("activity_type_id");

CREATE TABLE "app_screens" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "code"        varchar(100) NOT NULL,
  "name"        varchar(150) NOT NULL,
  "route"       varchar(255) NOT NULL,
  "description" varchar(255),
  "icon"        varchar(100),
  "module_id"   uuid NOT NULL,
  "sort_order"  integer NOT NULL DEFAULT 0,
  "is_active"   boolean NOT NULL DEFAULT true,
  "is_system"   boolean NOT NULL DEFAULT false,
  "created_at"  timestamptz(6) DEFAULT now(),
  "updated_at"  timestamptz(6) DEFAULT now(),
  CONSTRAINT "app_screens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "app_screens_code_key" ON "app_screens" ("code");
CREATE UNIQUE INDEX "app_screens_route_key" ON "app_screens" ("route");
CREATE INDEX "idx_app_screens_module" ON "app_screens" ("module_id");

CREATE TABLE "screen_roles" (
  "screen_id"  uuid NOT NULL,
  "role_id"    uuid NOT NULL,
  "created_at" timestamptz(6) DEFAULT now(),
  CONSTRAINT "screen_roles_pkey" PRIMARY KEY ("screen_id", "role_id")
);
CREATE INDEX "idx_screen_roles_role" ON "screen_roles" ("role_id");

CREATE TABLE "screen_permissions" (
  "screen_id"     uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at"    timestamptz(6) DEFAULT now(),
  CONSTRAINT "screen_permissions_pkey" PRIMARY KEY ("screen_id", "permission_id")
);
CREATE INDEX "idx_screen_permissions_permission" ON "screen_permissions" ("permission_id");

CREATE TABLE "permission_buttons" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "code"        varchar(50)  NOT NULL,
  "name"        varchar(100) NOT NULL,
  "description" varchar(255),
  "is_system"   boolean NOT NULL DEFAULT false,
  "created_at"  timestamptz(6) DEFAULT now(),
  "updated_at"  timestamptz(6) DEFAULT now(),
  CONSTRAINT "permission_buttons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "permission_buttons_code_key" ON "permission_buttons" ("code");

CREATE TABLE "screen_buttons" (
  "screen_id"     uuid NOT NULL,
  "button_id"     uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "is_active"     boolean NOT NULL DEFAULT true,
  "created_at"    timestamptz(6) DEFAULT now(),
  "updated_at"    timestamptz(6) DEFAULT now(),
  CONSTRAINT "screen_buttons_pkey" PRIMARY KEY ("screen_id", "button_id")
);
CREATE INDEX "idx_screen_buttons_button" ON "screen_buttons" ("button_id");
CREATE INDEX "idx_screen_buttons_permission" ON "screen_buttons" ("permission_id");

CREATE TABLE "user_permissions" (
  "tenant_user_id" uuid NOT NULL,
  "permission_id"  uuid NOT NULL,
  "is_granted"     boolean NOT NULL DEFAULT true,
  "created_at"     timestamptz(6) DEFAULT now(),
  "updated_at"     timestamptz(6) DEFAULT now(),
  CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("tenant_user_id", "permission_id")
);
CREATE INDEX "idx_user_permissions_permission" ON "user_permissions" ("permission_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Foreign keys
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "tenant_activity_types"
  ADD CONSTRAINT "tenant_activity_types_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant_subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "tenant_activity_types_activity_type_id_fkey"
    FOREIGN KEY ("activity_type_id") REFERENCES "business_activity_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "module_activity_types"
  ADD CONSTRAINT "module_activity_types_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "app_modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "module_activity_types_activity_type_id_fkey"
    FOREIGN KEY ("activity_type_id") REFERENCES "business_activity_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app_screens"
  ADD CONSTRAINT "app_screens_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "app_modules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "screen_roles"
  ADD CONSTRAINT "screen_roles_screen_id_fkey"
    FOREIGN KEY ("screen_id") REFERENCES "app_screens" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "screen_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "screen_permissions"
  ADD CONSTRAINT "screen_permissions_screen_id_fkey"
    FOREIGN KEY ("screen_id") REFERENCES "app_screens" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "screen_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "screen_buttons"
  ADD CONSTRAINT "screen_buttons_screen_id_fkey"
    FOREIGN KEY ("screen_id") REFERENCES "app_screens" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "screen_buttons_button_id_fkey"
    FOREIGN KEY ("button_id") REFERENCES "permission_buttons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "screen_buttons_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permissions"
  ADD CONSTRAINT "user_permissions_tenant_user_id_fkey"
    FOREIGN KEY ("tenant_user_id") REFERENCES "tenant_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "user_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Additive columns on existing tables + backfill
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "permissions" ADD COLUMN "resource" varchar(100);
ALTER TABLE "permissions" ADD COLUMN "action"   varchar(50);
UPDATE "permissions"
  SET "resource" = split_part("name", '.', 1),
      "action"   = NULLIF(split_part("name", '.', 2), '');

ALTER TABLE "roles" ADD COLUMN "is_system" boolean NOT NULL DEFAULT false;
UPDATE "roles"
  SET "is_system" = true
  WHERE lower("name") IN ('super_admin', 'admin', 'manager', 'staff', 'cashier', 'captain', 'kitchen');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed the two business activity types + backfill tenant_activity_types
--    (the app-level ensureAccessControlSeeded() re-upserts these idempotently).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "business_activity_types" ("code", "name", "description")
VALUES
  ('restaurant', 'Restaurant', 'Restaurant / food & beverage point of sale'),
  ('inventory',  'Inventory',  'Retail / inventory management')
ON CONFLICT ("code") DO NOTHING;

-- Tenants whose users carry module preferences: map each module to its activity type.
INSERT INTO "tenant_activity_types" ("tenant_id", "activity_type_id", "is_active")
SELECT DISTINCT ts."id", bat."id", true
FROM "tenant_subscriptions" ts
JOIN "tenant_users" tu ON tu."parent_tenant_id" = ts."id"
CROSS JOIN LATERAL unnest(tu."modules") AS m(module)
JOIN "business_activity_types" bat ON bat."code" = m.module::text
ON CONFLICT ("tenant_id", "activity_type_id") DO NOTHING;

-- Tenants with no users or empty module unions: enable BOTH types (preserves all-visible behavior).
INSERT INTO "tenant_activity_types" ("tenant_id", "activity_type_id", "is_active")
SELECT ts."id", bat."id", true
FROM "tenant_subscriptions" ts
CROSS JOIN "business_activity_types" bat
WHERE NOT EXISTS (
  SELECT 1 FROM "tenant_activity_types" tat WHERE tat."tenant_id" = ts."id"
)
ON CONFLICT ("tenant_id", "activity_type_id") DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Supabase realtime publication — required for the existing invalidation hooks.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE
  "tenant_activity_types",
  "user_permissions",
  "screen_buttons",
  "screen_roles",
  "screen_permissions";

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
--    Writes go exclusively through the service role (supabaseAdmin), which
--    bypasses RLS — so only SELECT policies are declared here. Realtime delivery
--    to the browser respects these SELECT policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- Global catalogs: readable by any authenticated user.
ALTER TABLE "business_activity_types" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_business_activity_types" ON "business_activity_types"
  FOR SELECT TO authenticated USING (true);

ALTER TABLE "app_modules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_app_modules" ON "app_modules"
  FOR SELECT TO authenticated USING (true);

ALTER TABLE "module_activity_types" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_module_activity_types" ON "module_activity_types"
  FOR SELECT TO authenticated USING (true);

ALTER TABLE "app_screens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_app_screens" ON "app_screens"
  FOR SELECT TO authenticated USING (true);

ALTER TABLE "screen_roles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_screen_roles" ON "screen_roles"
  FOR SELECT TO authenticated USING (true);

ALTER TABLE "screen_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_screen_permissions" ON "screen_permissions"
  FOR SELECT TO authenticated USING (true);

ALTER TABLE "permission_buttons" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_permission_buttons" ON "permission_buttons"
  FOR SELECT TO authenticated USING (true);

ALTER TABLE "screen_buttons" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_screen_buttons" ON "screen_buttons"
  FOR SELECT TO authenticated USING (true);

-- Tenant-scoped: a user reads only their own tenant's activity types.
ALTER TABLE "tenant_activity_types" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_tenant_activity_types" ON "tenant_activity_types"
  FOR SELECT TO authenticated USING (
    "tenant_id" IN (
      SELECT tu."parent_tenant_id" FROM "tenant_users" tu WHERE tu."auth_user_id" = auth.uid()
    )
    OR "tenant_id" IN (
      SELECT ts."id" FROM "tenant_subscriptions" ts WHERE ts."auth_user_id" = auth.uid()
    )
  );

-- Own overrides only: a user reads only their own permission overrides.
ALTER TABLE "user_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac024_read_user_permissions" ON "user_permissions"
  FOR SELECT TO authenticated USING (
    "tenant_user_id" IN (
      SELECT tu."id" FROM "tenant_users" tu WHERE tu."auth_user_id" = auth.uid()
    )
  );
