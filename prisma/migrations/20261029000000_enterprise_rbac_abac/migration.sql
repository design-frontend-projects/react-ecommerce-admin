-- ============================================================================
-- Migration: 20261029000000_enterprise_rbac_abac
-- Description: Milestone 1 Additive PostgreSQL DDL for Enterprise RBAC & ABAC
--   1. Creates data_scope_enum and approval_status_enum
--   2. Extends roles, user_roles, role_permissions, and user_permissions
--   3. Creates companion assignment tables: tenant_user_branches, tenant_user_warehouses
--   4. Creates workflow and audit tables: approval_rules, approval_requests, security_audit_logs
--   5. Configures Row Level Security (RLS) tenant isolation policies
--   6. Performs safe, idempotent data backfills
-- Invariants:
--   - 100% additive DDL (IF NOT EXISTS everywhere)
--   - ZERO DROP TABLE and ZERO DROP COLUMN statements
-- ============================================================================

-- ─── 1. CREATE ENUMS ─────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_scope_enum') THEN
    CREATE TYPE "public"."data_scope_enum" AS ENUM (
      'TENANT',
      'ASSIGNED_BRANCHES',
      'ASSIGNED_WAREHOUSES',
      'OWN_RECORDS'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
    CREATE TYPE "public"."approval_status_enum" AS ENUM (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  END IF;
END $$;

-- ─── 2. EXTEND ROLES TABLE ──────────────────────────────────────────────────

ALTER TABLE "public"."roles" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "public"."roles" ADD COLUMN IF NOT EXISTS "data_scope" "public"."data_scope_enum" DEFAULT 'TENANT';
ALTER TABLE "public"."roles" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 100;
ALTER TABLE "public"."roles" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_tenant_id_fkey') THEN
    ALTER TABLE "public"."roles"
      ADD CONSTRAINT "roles_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_roles_tenant_id" ON "public"."roles"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_roles_tenant_active" ON "public"."roles"("tenant_id", "is_active");

-- ─── 3. EXTEND USER_ROLES TABLE ─────────────────────────────────────────────

ALTER TABLE "public"."user_roles" ADD COLUMN IF NOT EXISTS "assigned_by" uuid;
ALTER TABLE "public"."user_roles" ADD COLUMN IF NOT EXISTS "assigned_at" timestamptz DEFAULT now();
ALTER TABLE "public"."user_roles" ADD COLUMN IF NOT EXISTS "data_scope" "public"."data_scope_enum";
ALTER TABLE "public"."user_roles" ADD COLUMN IF NOT EXISTS "is_primary" boolean DEFAULT false;

-- ─── 4. EXTEND ROLE_PERMISSIONS TABLE ───────────────────────────────────────

ALTER TABLE "public"."role_permissions" ADD COLUMN IF NOT EXISTS "granted_by" uuid;
ALTER TABLE "public"."role_permissions" ADD COLUMN IF NOT EXISTS "data_scope" "public"."data_scope_enum";
ALTER TABLE "public"."role_permissions" ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();

-- ─── 5. EXTEND USER_PERMISSIONS TABLE ───────────────────────────────────────

ALTER TABLE "public"."user_permissions" ADD COLUMN IF NOT EXISTS "granted_by" uuid;
ALTER TABLE "public"."user_permissions" ADD COLUMN IF NOT EXISTS "data_scope" "public"."data_scope_enum";
ALTER TABLE "public"."user_permissions" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;

-- ─── 6. CREATE TENANT_USER_BRANCHES TABLE ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."tenant_user_branches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  "tenant_user_id" uuid NOT NULL REFERENCES "public"."tenant_users"("id") ON DELETE CASCADE,
  "branch_id" uuid NOT NULL REFERENCES "public"."branches"("id") ON DELETE CASCADE,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_user_id" uuid,
  CONSTRAINT "uq_tenant_user_branches" UNIQUE ("tenant_user_id", "branch_id")
);

CREATE INDEX IF NOT EXISTS "idx_tenant_user_branches_tenant_user" ON "public"."tenant_user_branches"("tenant_id", "tenant_user_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_user_branches_branch" ON "public"."tenant_user_branches"("branch_id");

-- ─── 7. CREATE TENANT_USER_WAREHOUSES TABLE ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."tenant_user_warehouses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  "tenant_user_id" uuid NOT NULL REFERENCES "public"."tenant_users"("id") ON DELETE CASCADE,
  "warehouse_id" uuid NOT NULL REFERENCES "public"."warehouses"("id") ON DELETE CASCADE,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_user_id" uuid,
  CONSTRAINT "uq_tenant_user_warehouses" UNIQUE ("tenant_user_id", "warehouse_id")
);

CREATE INDEX IF NOT EXISTS "idx_tenant_user_warehouses_tenant_user" ON "public"."tenant_user_warehouses"("tenant_id", "tenant_user_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_user_warehouses_warehouse" ON "public"."tenant_user_warehouses"("warehouse_id");

-- ─── 8. CREATE APPROVAL_RULES TABLE ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."approval_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  "module" varchar(50) NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "action" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" varchar(255),
  "min_amount" numeric(18, 4) DEFAULT 0,
  "max_amount" numeric(18, 4),
  "required_role_id" uuid REFERENCES "public"."roles"("id") ON DELETE SET NULL,
  "required_permission" varchar(100),
  "approval_level" varchar(50),
  "enforce_separation_of_duties" boolean NOT NULL DEFAULT true,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by_user_id" uuid
);

CREATE INDEX IF NOT EXISTS "idx_approval_rules_lookup" ON "public"."approval_rules"("tenant_id", "module", "entity_type", "is_active");

-- ─── 9. CREATE APPROVAL_REQUESTS TABLE ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
  "rule_id" uuid REFERENCES "public"."approval_rules"("id") ON DELETE SET NULL,
  "module" varchar(50) NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "entity_id" varchar(100) NOT NULL,
  "requested_by_user_id" uuid NOT NULL,
  "approved_by_user_id" uuid,
  "status" "public"."approval_status_enum" NOT NULL DEFAULT 'pending',
  "requested_amount" numeric(18, 4),
  "currency" varchar(10) DEFAULT 'USD',
  "reason" varchar(500),
  "decision_reason" varchar(500),
  "reviewed_at" timestamptz,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_approval_requests_status" ON "public"."approval_requests"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_entity" ON "public"."approval_requests"("tenant_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_requester" ON "public"."approval_requests"("requested_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_approver" ON "public"."approval_requests"("approved_by_user_id");

-- ─── 10. CREATE SECURITY_AUDIT_LOGS TABLE ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."security_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid,
  "actor_auth_user_id" uuid,
  "actor_tenant_user_id" uuid,
  "actor_email" varchar(255),
  "action" varchar(100) NOT NULL,
  "resource_type" varchar(100) NOT NULL,
  "resource_id" varchar(255),
  "status" varchar(30) NOT NULL DEFAULT 'SUCCESS',
  "severity" varchar(30) NOT NULL DEFAULT 'INFO',
  "data_scope" varchar(50),
  "diff" jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "route" varchar(255),
  "prev_record_hash" varchar(64),
  "record_hash" varchar(64),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_tenant_created" ON "public"."security_audit_logs"("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_status" ON "public"."security_audit_logs"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_action_status" ON "public"."security_audit_logs"("action", "status");
CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_actor" ON "public"."security_audit_logs"("actor_auth_user_id");
CREATE INDEX IF NOT EXISTS "idx_security_audit_logs_created" ON "public"."security_audit_logs"("created_at" DESC);

-- ─── 11. ENABLE ROW LEVEL SECURITY & POLICIES ───────────────────────────────

ALTER TABLE "public"."tenant_user_branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tenant_user_warehouses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."approval_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."security_audit_logs" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_tenant_user_branches') THEN
    CREATE POLICY "tenant_isolation_tenant_user_branches" ON "public"."tenant_user_branches"
      AS PERMISSIVE FOR ALL
      USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_tenant_user_warehouses') THEN
    CREATE POLICY "tenant_isolation_tenant_user_warehouses" ON "public"."tenant_user_warehouses"
      AS PERMISSIVE FOR ALL
      USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_approval_rules') THEN
    CREATE POLICY "tenant_isolation_approval_rules" ON "public"."approval_rules"
      AS PERMISSIVE FOR ALL
      USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_approval_requests') THEN
    CREATE POLICY "tenant_isolation_approval_requests" ON "public"."approval_requests"
      AS PERMISSIVE FOR ALL
      USING (tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_security_audit_logs') THEN
    CREATE POLICY "tenant_isolation_security_audit_logs" ON "public"."security_audit_logs"
      AS PERMISSIVE FOR ALL
      USING (tenant_id IS NULL OR tenant_id = (NULLIF(current_setting('app.current_tenant_id', true), ''))::uuid);
  END IF;
END $$;

-- ─── 12. DATA BACKFILL: USER BRANCHES & WAREHOUSES ──────────────────────────

INSERT INTO "public"."tenant_user_branches" ("tenant_id", "tenant_user_id", "branch_id", "is_primary")
SELECT tu."tenant_id", tu."id", tu."branch_id", true
FROM "public"."tenant_users" tu
JOIN "public"."tenants" t ON t."id" = tu."tenant_id"
JOIN "public"."branches" b ON b."id" = tu."branch_id"
WHERE tu."tenant_id" IS NOT NULL AND tu."branch_id" IS NOT NULL
ON CONFLICT ("tenant_user_id", "branch_id") DO NOTHING;

INSERT INTO "public"."tenant_user_warehouses" ("tenant_id", "tenant_user_id", "warehouse_id", "is_primary")
SELECT tu."tenant_id", tu."id", tu."warehouse_id", true
FROM "public"."tenant_users" tu
JOIN "public"."tenants" t ON t."id" = tu."tenant_id"
JOIN "public"."warehouses" w ON w."id" = tu."warehouse_id"
WHERE tu."tenant_id" IS NOT NULL AND tu."warehouse_id" IS NOT NULL
ON CONFLICT ("tenant_user_id", "warehouse_id") DO NOTHING;

-- ─── 13. DATA BACKFILL: ROLES DEFAULTS & SYSTEM ROLES ───────────────────────

UPDATE "public"."roles"
SET "data_scope" = 'TENANT'::"public"."data_scope_enum"
WHERE "data_scope" IS NULL;

UPDATE "public"."roles"
SET "is_system" = true
WHERE "tenant_id" IS NULL
  AND "name" IN ('super_admin', 'admin', 'manager', 'cashier', 'captain', 'kitchen', 'staff');
