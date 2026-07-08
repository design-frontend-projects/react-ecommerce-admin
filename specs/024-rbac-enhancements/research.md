# Research: RBAC Module Enhancement — Gap Analysis

**Feature**: `024-rbac-enhancements` | **Date**: 2026-07-08
**Input**: Full audit of the existing RBAC implementation (schema, server fns, API routes, client guards, navigation).

## Current Implementation Inventory

### Active data model (in use everywhere)

| Table | Purpose | Notes |
|---|---|---|
| `roles` | Role catalog (`id`, `name` unique, `description`, `is_active`) | 7 roles lazily seeded |
| `permissions` | Permission catalog (`id`, `name` unique, `description`) | Flat `resource.action` strings — no resource/action columns |
| `role_permissions` | roles ↔ permissions (composite PK) | Cascade deletes |
| `user_roles` | users ↔ roles (composite PK) | **Caveat**: `auth_user_id` column actually FKs `tenant_users.id` (the row PK), not the Supabase auth id |
| `tenant_users` | Staff account (`auth_user_id`, `email` unique, `default_role`, `modules user_module[]`, `primary_module`, `parent_tenant_id → tenant_subscriptions.id`) | `parent_tenant_id` is the de-facto tenant anchor |
| `profiles` | Per-auth-user profile (`is_owner`, `system_owner`, `branch_id`, free-text `role`, `activity`) | `role` is a legacy mirror, still read as fallback in places |
| `tenant_subscriptions` | The closest thing to an "account/tenant" entity | No activity-type/modules fields |

### Server-side enforcement

- `src/server/utils/auth.ts` — `requireAuth(token, requiredPermissions?)`: validates Supabase JWT, loads role/permission names via `tenant_users → user_roles → roles → role_permissions → permissions`, enforces with `hasAnyPermission` (supports `*` and `resource.*` wildcards).
- `src/server/fns/rbac.ts` — `ensureBasePermissionsSeeded()` lazily upserts the 15 base permissions and 7 default roles on catalog reads; role CRUD (`createRole`/`updateRole`/`deleteRole`/`setRolePermissions`/`toggleRolePermission`); `updateUserRoles(userId, roleIds[])` (already multi-role); `syncClerkUserRoleMetadata` writes roles/permissions into Supabase `user_metadata` (display-only — `requireAuth` reads the DB).
- `src/server/fns/create-user.ts` — `createUserDirect` server fn: `supabaseAdmin.auth.admin.createUser` + `tenant_users` + `user_roles` + `profiles`. **Client-invoked directly** (bypasses `/api` + `requireAuth`); does its own admin check with a `profiles.role` fallback; single `roleId`; hard-codes `modules: ['inventory','restaurant']`.
- `src/server/fns/invitations.ts` — `inviteUser` via `inviteUserByEmail` (single role), `listPendingInvitations`, `revokeInvitation`.

### API surface (`src/app/api/**`)

| Route | Methods → permission |
|---|---|
| `/api/rbac` | GET `users.view`; POST/PATCH/DELETE `roles.manage` |
| `/api/rbac/permissions` | PUT `permissions.manage` (role↔permission mapping only) |
| `/api/users` | GET `users.view` (no POST — creation bypasses REST) |
| `/api/users/roles` | POST `users.manage` (accepts `roleIds[]`) |
| `/api/users/invite` | POST `users.manage` |
| `/api/users/onboarding` | POST (self) |

### Client-side

- `src/features/users/` is the single RBAC hub: `pages/user-management-page.tsx` with 3 tabs (Users / Roles / Permissions) mounted at the only RBAC route `/_authenticated/users`.
- Guards: `<Can role= permission=>` (`src/components/rbac/Can.tsx`) and `<RBACGuard resource action>` (`src/features/users/components/rbac-guard.tsx`, maps action → `resource.view|manage` coarsely).
- State: Zustand `useRBACStore` (`src/features/users/data/store.ts`); live refresh via Supabase Realtime channels on `profiles`, `user_roles`, `tenant_users`, `role_permissions` (`src/features/users/data/queries.ts`).
- Default catalog: `src/features/users/data/rbac.ts` — 15 permissions (`dashboard.view`, `users.view`, `users.manage`, `roles.manage`, `permissions.manage`, `settings.manage`, `products.view`, `products.manage`, `inventory.view`, `inventory.manage`, `orders.view`, `orders.manage`, `orders.create`, `reports.view`, `pos.access`), 7 roles (`super_admin ['*']`, `admin`, `manager`, `staff`, `cashier`, `captain`, `kitchen`), `ROLE_PRIORITY`, `hasPermission` wildcard helpers.

### Navigation

- Nav data: `src/components/layout/data/sidebar-data.ts` (hook, i18n) — groups: System, General, Restaurant POS, Inventory, Lookups, Other. `NavItem` already supports `roles?: string[]`, `permissions?: string[]`, `isSystemOwner?`.
- Filtering: `canAccessItem()` in `src/components/layout/app-sidebar.tsx` — recursive role/permission intersection against `useRBACStore`. **No module/activity-type filtering.**
- `_authenticated/route.tsx` guards auth + onboarding + subscription (binary active check; `system_owner` bypass). `_authenticated/_system.tsx` gates on `profiles.system_owner` (separate mechanism from permissions).
- Sign-in module tabs (`inventory` | `restaurant`) affect only the post-login redirect.
- Unused hooks `useCurrentUserModules()` / `useHasModuleAccess()` in `src/features/auth/queries.ts` read `tenant_users.modules` but are wired nowhere.

## Requirement vs. Current State

| # | Requirement | Current state | Gap |
|---|---|---|---|
| 4.1 | Roles (admin, super_admin, kitchen, captain, cashier) manageable by admin/super_admin; multi-role per user | All 5 required roles (plus `manager`, `staff`) seeded; `user_roles` is many-to-many; role CRUD behind `/api/rbac` `roles.manage` | Creation UI and `createUserDirect` are single-role; role source split across `user_roles` / `tenant_users.default_role` / `profiles.role` |
| 4.2 | Permissions independent of roles, attachable to roles, screens, buttons; CRUD by admin | `permissions` table + `role_permissions`; role↔permission editing via PUT `/api/rbac/permissions` | No screen or button attachment; no standalone permission create/delete API |
| 4.3 | User mgmt via `supabase.admin.auth.createUser`; one-or-more roles at creation; change later | `createUserDirect` exists and works | Bypasses `/api` + `requireAuth`; single `roleId`; hard-coded `modules`; no rollback if DB writes fail after auth-user creation |
| 4.4 | Screen/module registry as data; admins can register new screens; management screens for Roles/Permissions/Users/Screens/Buttons | None — screens are code-only TanStack routes; nav access rules are string literals in `sidebar-data.ts`; Roles/Permissions are tabs, not screens | New `app_modules`, `app_screens`, `screen_roles`, `screen_permissions` tables + full seed of existing routes + 4 new management routes |
| 4.5 | Permission buttons (create/update/delete/approve/reject/pay) per screen per role/user | None — `RBACGuard` maps any action to `resource.manage` | New `permission_buttons`, `screen_buttons`, `user_permissions` tables + `<CanAction>` component + server checks |
| 4.6 | Activity types per account/tenant drive module visibility, combined with RBAC | Per-user `user_module` enum on `tenant_users.modules`, unwired to nav; no tenant-level concept; `canAccessItem` filters by role/permission only | New `business_activity_types`, `tenant_activity_types`, `module_activity_types`; composed sidebar filter; route-level enforcement; migration/backfill |

## Decisions

### D-001: Extend the ACTIVE table set; leave `rbac_*` dormant

A parallel, dormant `rbac_*` table set exists (`rbac_roles` with `tenant_id`/`is_system`, `rbac_permissions` with `code`/`resource`/`action`, `rbac_user_roles` with `expires_at`, `rbac_tenants` with `activity_type`, plus subscriptions/otp/audit tables). **No code reads or writes any of them**, none declare Prisma relations, and every guard/seed/query is wired to the active set. Migrating would put every enforcement path at risk for no functional gain.

**Decision**: build all new capability on the active set. `rbac_*`, `employee_roles`, and `res_roles` receive `/// DEPRECATED — unused` doc comments in `schema.prisma` only (additive-migrations convention forbids drops). Selected `rbac_*` ideas are adopted as additive columns instead (optional `permissions.resource`/`action`, `roles.is_system`).

### D-002: Do NOT reuse the existing `activity_types` table

`activity_types` (code/name/description) is the **audit-log category** table, FK'd by `audit_logs.activity_type_id`. Overloading it would entangle audit taxonomy with access control. Business activity types get a new `business_activity_types` table.

### D-003: Tenant anchor is `tenant_subscriptions.id`

There is no standalone `tenants` model; tenancy is expressed through `tenant_users.parent_tenant_id → tenant_subscriptions.id`. Activity types therefore map to tenants via `tenant_activity_types.tenant_id → tenant_subscriptions.id`.

### D-004: Buttons are permissions, not a parallel system

Enabling button `pay` on screen `orders` creates/links an ordinary `permissions` row named `orders.pay`. Role grants are plain `role_permissions`; user-specific grants/denies are `user_permissions`. Server enforcement stays `requireAuth(token, 'orders.pay')` — zero new middleware; wildcard semantics (`*`, `orders.*`) keep working.

### D-005: Dedicated routes instead of tabs for management screens

Requirement 4.4 treats every management surface as a registrable screen with its own route and access rules. Tabs inside `/users` cannot be individually registered, deep-linked, or gated. New routes live under `/_authenticated/access-control/*`; the Roles/Permissions tabs are removed from the users page and their components reused as page bodies.

## Known Defects to Address (pre-existing)

1. **`user_roles.auth_user_id` misnomer** — FKs `tenant_users.id`. Fix at the Prisma level only: rename field to `tenant_user_id` with `@map("auth_user_id")` (no DB migration).
2. **Role-source inconsistency** — `user_roles` is declared canonical; `tenant_users.default_role` and `profiles.role` become write-through mirrors maintained solely by `updateUserRoles()`; authorization reads of `profiles.role` (fallbacks in `checkAdminAccess`, `create-user.ts`) are removed.
3. **`createUserDirect` bypasses the API layer** — moved behind `POST /api/users` with `requireAuth(token, 'users.manage')`.
4. **Single-role UIs** despite many-to-many model — multi-select role assignment at creation and edit.
5. **Hard-coded `modules: ['inventory','restaurant']`** at creation — derived from tenant activity types instead.
6. **Two admin clients** (`src/server/supabase.ts` and `src/server/supabase-admin.ts` both export `supabaseAdmin`) — consolidation noted as a Phase 3 cleanup, not a blocker.

## Alternatives Considered

- **Per-user modules instead of tenant activity types** (promote `tenant_users.modules` to drive nav): rejected — contradicts the "per account/tenant" requirement and forces per-staff configuration. The column is kept as a derived mirror for legacy readers and eventually deprecated.
- **DB-driven sidebar (render nav from `app_screens`)**: deferred — i18n titles and icons live in code; Phase 6 tags the static nav with `module`/screen codes so behavior is data-verified without losing translations. Full registry-driven nav is a candidate follow-up feature.
- **JSON permissions on roles (à la `res_roles.permissions Json`)**: rejected — loses referential integrity, wildcard resolution, and the existing realtime invalidation on `role_permissions`.
