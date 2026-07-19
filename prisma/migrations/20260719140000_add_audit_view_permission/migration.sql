-- Add the tenant audit-trail permission and grant it to the admin role.
-- Idempotent: safe to re-run; super_admin covers it via wildcard.

-- Rename a pre-existing legacy 2-part spelling in place (id-preserving),
-- mirroring 20260719130000_rename_permissions_three_part.
UPDATE "permissions"
SET "name" = 'access_control.audit.view',
    "resource" = 'access_control.audit',
    "action" = 'view',
    "updated_at" = NOW()
WHERE "name" = 'audit.view'
  AND NOT EXISTS (
    SELECT 1 FROM "permissions" WHERE "name" = 'access_control.audit.view'
  );

INSERT INTO "permissions" ("name", "description", "resource", "action")
SELECT
  'access_control.audit.view',
  'View the RBAC change audit trail for the tenant.',
  'access_control.audit',
  'view'
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" WHERE "name" = 'access_control.audit.view'
);

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."name" = 'access_control.audit.view'
WHERE r."name" = 'admin'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
