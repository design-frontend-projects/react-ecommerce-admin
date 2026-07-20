# Feature 027 — Data Model (delta over feature-024)

Baseline schema: `prisma/schema.prisma` + `specs/024-rbac-enhancements/data-model.md`.
This document describes **only what changes**; unchanged tables are referenced, not restated.

## 1. Tenancy scoping map

| Table | Scope | RLS applies? | Notes |
|---|---|---|---|
| `app_modules`, `app_screens`, `permissions`, `roles`, `permission_buttons` | **Global catalog** | Read: all authenticated; Write: `super_admin`/`.manage` | Not tenant-scoped by design (Q2). |
| `screen_permissions`, `screen_roles`, `screen_buttons`, `module_activity_types`, `role_permissions` | **Global mapping** | Write-gated by permission | Define what's possible platform-wide. |
| `user_roles`, `user_permissions` | **Per-user** (tenant via `tenant_users`) | Yes — scoped by user/tenant | The effective grant surface. |
| `tenant_activity_types` | **Per-tenant** | Yes — `tenant_id` | Enables modules per tenant's business activity. |
| `tenant_users` | **Per-tenant** | Yes — `parent_tenant_id`/`auth_user_id` | Membership + (new) `force_password_change`. |

## 2. Additive schema changes (all `[NEW]`, additive migration)

1. `tenant_users.force_password_change boolean not null default false` — enforced at first sign-in.
2. `tenant_users.password_set_at timestamptz null` — optional audit of last rotation.
3. **`rbac_audit`** (optional, Part 8 auditability) — append-only:
   `id uuid pk`, `actor_auth_user_id uuid`, `action text` (e.g. `role.permissions.updated`),
   `target_type text`, `target_id text`, `diff jsonb`, `created_at timestamptz default now()`.
   Indexes: `(created_at desc)`, `(target_type, target_id)`.
4. **Verify/ensure index** on `tenant_users.auth_user_id` (resolution hot path). Add if missing.

> **No `temporary_password` column** — temp passwords are returned once via API, never stored (Q1).

## 3. Effective-permission resolution (reference)

See `spec.md` Part 3. Canonical code: `resolveEffectivePermissions`
(`src/features/users/data/rbac.ts`), server entry `getDatabasePermissionNames`
(`src/server/utils/auth.ts`). Precedence: **user-deny > user-grant > role-grant > wildcard**,
deny-by-default. Hot-path query traverses
`tenant_users → user_roles → roles → role_permissions → permissions` (+ `user_permissions`).

## 4. Cascade / integrity

Unchanged from feature-024: all RBAC join tables `onDelete: Cascade`; `is_system` rows are
delete-protected in server fns; a `permission` referenced by a `screen_button` cannot be deleted.
`rbac_audit` rows are **never** cascade-deleted (audit retention).
