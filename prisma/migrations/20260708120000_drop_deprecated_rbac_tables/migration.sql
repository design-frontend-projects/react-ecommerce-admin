-- Drop deprecated `rbac_*` RBAC tables — ADDITIVE, destructive cleanup migration.
-- Removes the never-wired parallel RBAC model family that was superseded by the
-- active non-prefixed tables (roles / permissions / tenant_users / user_roles /
-- role_permissions / user_permissions). These tables were introspected from a
-- pre-existing database and were never created by a tracked migration, and no
-- application code ever read or wrote them.
--
-- CASCADE also removes the row-level-security policies and any dependent objects
-- attached to these tables. IF EXISTS keeps the migration idempotent for
-- environments where a given table was never present.

DROP TABLE IF EXISTS "rbac_audit_logs" CASCADE;
DROP TABLE IF EXISTS "rbac_otp_codes" CASCADE;
DROP TABLE IF EXISTS "rbac_permissions" CASCADE;
DROP TABLE IF EXISTS "rbac_role_permissions" CASCADE;
DROP TABLE IF EXISTS "rbac_roles" CASCADE;
DROP TABLE IF EXISTS "rbac_subscriptions" CASCADE;
DROP TABLE IF EXISTS "rbac_tenant_subscriptions" CASCADE;
DROP TABLE IF EXISTS "rbac_tenant_users" CASCADE;
DROP TABLE IF EXISTS "rbac_tenants" CASCADE;
DROP TABLE IF EXISTS "rbac_user_roles" CASCADE;
