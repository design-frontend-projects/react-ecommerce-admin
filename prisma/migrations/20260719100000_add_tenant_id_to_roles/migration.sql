-- Foundation for tenant-scoped custom roles (RBAC refactor, phase 1).
-- NULL tenant_id = platform/system role (the 7 seeded roles stay NULL).
--
-- NOTE: the global unique constraint on roles.name is intentionally RETAINED
-- for now — seeding upserts roles by name and invitations look roles up by
-- name (`findUnique({ where: { name } })`). The relaxation to per-tenant
-- uniqueness (partial unique indexes) ships together with the tenant-role
-- creation UI, once those call sites are tenant-aware.
--
-- Idempotent by convention (see 2026-07 migration history).

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;

DO $$
BEGIN
  ALTER TABLE "roles"
    ADD CONSTRAINT "roles_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant_subscriptions"("id")
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_roles_tenant_id" ON "roles"("tenant_id");
