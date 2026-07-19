-- RBAC refactor phase 1: missing FK-reverse-lookup indexes and grant/assign
-- audit columns. All additive and idempotent.
--
-- tenant_users.parent_tenant_id is the primary tenant-scoping filter and had
-- no index. role_permissions / user_roles composite PKs only cover
-- (role_id, ...) / (tenant_user_id, ...) prefixes, so reverse lookups by
-- permission_id / role_id scanned.
--
-- (tenant_users.auth_user_id already has a unique index — used by
-- findUnique in requireAuth — so no extra index is added for it.)

CREATE INDEX IF NOT EXISTS "idx_tenant_users_parent_tenant_id"
  ON "tenant_users"("parent_tenant_id");

CREATE INDEX IF NOT EXISTS "idx_role_permissions_permission_id"
  ON "role_permissions"("permission_id");

CREATE INDEX IF NOT EXISTS "idx_user_roles_role_id"
  ON "user_roles"("role_id");

-- Who granted a role→permission link, and when it was created.
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "granted_by" uuid;
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();

-- Who assigned a user→role link, and when.
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "assigned_by" uuid;
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "assigned_at" timestamptz DEFAULT now();

-- Who set a per-user permission override.
ALTER TABLE "user_permissions" ADD COLUMN IF NOT EXISTS "granted_by" uuid;
