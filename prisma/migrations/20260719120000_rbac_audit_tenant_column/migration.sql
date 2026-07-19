-- RBAC refactor phase 1: tenant column on the append-only RBAC audit log so
-- tenant-admin audit views can filter without scanning. actor stays nullable
-- and FK-less on purpose — audit rows must survive actor deletion.

ALTER TABLE "rbac_audit" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;

CREATE INDEX IF NOT EXISTS "idx_rbac_audit_tenant_created"
  ON "rbac_audit"("tenant_id", "created_at" DESC);
