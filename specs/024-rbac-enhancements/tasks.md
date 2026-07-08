# Tasks: RBAC Module Enhancement

**Feature**: `024-rbac-enhancements` | **Plan**: [plan.md](./plan.md)

Legend: `[P]` = parallelizable within its phase. Each phase is independently shippable.

## Phase 1 — Schema & Migrations

- [ ] T001 Add 9 new models to `prisma/schema.prisma` per data-model.md (`business_activity_types`, `tenant_activity_types`, `app_modules`, `module_activity_types`, `app_screens`, `screen_roles`, `screen_permissions`, `permission_buttons`, `screen_buttons`, `user_permissions`) with relations/indexes.
- [ ] T002 Additive extensions: `roles.is_system`, `permissions.resource`/`action` (nullable), relation fields on `roles`/`permissions`/`tenant_subscriptions`/`tenant_users`.
- [ ] T003 Prisma field rename `user_roles.tenant_user_id @map("auth_user_id")` + mechanical update of all TS references (server fns, queries); audit raw-SQL/Supabase-client call sites that use the physical column name (realtime filters in `src/features/users/data/queries.ts`).
- [ ] T004 `/// DEPRECATED` doc comments on `rbac_*`, `employee_roles`, `res_roles`.
- [ ] T005 Migration SQL: tables + indexes; backfill `permissions.resource/action` (`split_part(name,'.',1|2)`); backfill `roles.is_system` for the 7 seeded roles.
- [ ] T006 Migration SQL: add new tables to `supabase_realtime` publication; RLS policies (service-role writes; tenant-scoped reads for `tenant_activity_types`/`user_permissions`; authenticated reads for catalogs).
- [ ] T007 `pnpm exec prisma generate` + `pnpm build` green with zero behavior change.

## Phase 2 — Seeds

- [ ] T010 [P] `src/features/access-control/data/seed-data.ts`: activity types, modules + `module_activity_types`, 6 buttons, ~35-screen registry (routes per data-model.md §Seeding), default `screen_roles`/`screen_permissions` derived from current `sidebar-data.ts` literals, example `screen_buttons` (orders×pay→cashier/admin, orders×create/update→captain).
- [ ] T011 [P] Extend `BASE_PERMISSION_DEFINITIONS` + `DEFAULT_ROLE_PERMISSION_NAMES` in `src/features/users/data/rbac.ts` with `screens.view`, `screens.manage`, `buttons.manage`.
- [ ] T012 `src/server/fns/access-control-seed.ts`: `ensureAccessControlSeeded()` — upsert catalogs always, mappings only when parent empty; `app_settings` `rbac_seed_version` guard.
- [ ] T013 Backfill migration: `tenant_activity_types` from union of each tenant's `tenant_users.modules` (both types when empty).
- [ ] T014 Vitest: seed idempotency (double-run produces no duplicates, preserves admin edits to mappings).

## Phase 3 — Server Fns & API

- [ ] T020 `resolveEffectivePermissions(rolePerms, grants, denies)` pure fn in `src/features/users/data/rbac.ts` + unit tests (deny > grant > role > wildcard).
- [ ] T021 Extend `getDatabasePermissionNames` (`src/server/utils/auth.ts`) to read `user_permissions` and apply T020; `requireAuth` signature unchanged.
- [ ] T022 [P] `src/server/fns/screens.ts`: `getScreensWithAccess`, `createScreen`, `updateScreen` (is_system field locks), `deleteScreen` (is_system block), `setScreenRoles`, `setScreenPermissions`.
- [ ] T023 [P] `src/server/fns/buttons.ts`: catalog CRUD (is_system protection), `setScreenButtons` (transaction: upsert `<screen>.<button>` permission → upsert `screen_buttons` → deactivate removed).
- [ ] T024 [P] `src/server/fns/activity-types.ts`: `getTenantActivityTypes` (+ module map), `setTenantActivityTypes` (+ refresh `tenant_users.modules` mirrors).
- [ ] T025 Extend `src/server/fns/rbac.ts`: standalone permission POST/DELETE (delete blocked when `screen_buttons` references), `setUserPermissionOverrides`; remove `profiles.role` authorization fallbacks.
- [ ] T026 Refactor `src/server/fns/create-user.ts`: plain `createUser(input, caller)`; `roleIds[]`; modules derived from tenant activity types; `$transaction` + auth-user delete compensation; metadata sync direct (not via `updateUserRoles`).
- [ ] T027 API routes per contracts/api.md: `POST /api/users`, `PUT /api/users/permissions`, `/api/rbac/screens` (+`/access`), `/api/rbac/buttons`, `/api/rbac/screen-buttons`, extended `/api/rbac/permissions`, `/api/tenant/activity-types`; extend `/api/users/invite` + `/api/tenant/onboard` for `roleIds[]`/initial activity types.
- [ ] T028 Deprecate client-invoked `createUserDirect` (delegate one release, then remove).
- [ ] T029 Vitest: contract tests — 403 without permission on every new endpoint; compensation test (DB failure → auth user deleted); button permission upsert idempotency.

## Phase 4 — Client Data Layer

- [ ] T030 [P] `src/features/access-control/data/{schema,types,actions,queries}.ts` — Zod contracts + bearer-token fetch wrappers (pattern: `src/features/users/data/actions.ts`).
- [ ] T031 Extend `useRBACStore`: `activeActivityTypeCodes`, `moduleActivityMap`, effective permissions (via T020), screens/buttons catalog cache.
- [ ] T032 `useTenantActivityTypes()` hook + realtime channel on `tenant_activity_types` (tenant filter); add `user_permissions` channel to `src/features/users/data/queries.ts`.
- [ ] T033 `<CanAction screen action mode="hide|disable">` in `src/features/access-control/components/can-action.tsx` (checks effective permission + `screen_buttons.is_active`).
- [ ] T034 Multi-role UI: `create-user-form.tsx` + `invite-form.tsx` multi-select (`roleIds[]` min 1, Command+Popover combobox), `user-list.tsx` role badges + multi-select edit; new `useCreateUser` calls `POST /api/users`.
- [ ] T035 Reimplement `useHasModuleAccess()` atop `useTenantActivityTypes()` (same signature).

## Phase 5 — Management Screens

- [ ] T040 [P] Routes `src/routes/_authenticated/access-control/{roles,permissions,screens,buttons}.tsx` (thin wrappers, per-permission gating).
- [ ] T041 [P] `roles-page.tsx` + `permissions-page.tsx` reusing `roles-management.tsx`/`permissions-management.tsx`/`permission-editor.tsx`; permissions page shows referencing roles/screens/buttons.
- [ ] T042 `screens-page.tsx`: module-grouped registry, register/edit dialog, roles & permissions assignment, is_system locks, "route not implemented" badge.
- [ ] T043 `buttons-page.tsx`: catalog CRUD + screen×button grid with role grants and per-user override entry point.
- [ ] T044 Remove Roles/Permissions tabs from `user-management-page.tsx`; add user-permission-override editor to user detail.
- [ ] T045 RTL + i18n pass on all new screens.

## Phase 6 — Navigation & Visibility

- [ ] T050 `module?: string` on `NavItem` (`src/components/layout/types.ts`); tag groups/items in `sidebar-data.ts`; add "Access Control" nav group.
- [ ] T051 Compose `activityTypeEnabled()` into `canAccessItem()` (`src/components/layout/app-sidebar.tsx`): `subscriptionActive AND activityType AND role/permission`.
- [ ] T052 Route-level enforcement: activity-type context in `_authenticated/route.tsx`; redirect for excluded-module routes.
- [ ] T053 Sign-in module tabs derived from tenant activity types (hidden for single-activity tenants); post-login redirect logic.
- [ ] T054 Apply `<CanAction>` to first surfaces: orders pay/approve/reject, POS pay, purchase-orders approve.
- [ ] T055 E2E: cashier sees orders with only Pay enabled; restaurant-only tenant sees no inventory nav and gets redirected from `/inventory`; activity-type change propagates without re-login.
- [ ] T056 `pnpm lint && pnpm test && pnpm build && pnpm knip` clean.
