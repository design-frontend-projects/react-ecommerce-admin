# Implementation Plan: RBAC Module Enhancement

**Branch**: `024-rbac-enhancements` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-rbac-enhancements/spec.md`

## Summary

Extend the active RBAC system (roles/permissions/user_roles/role_permissions) with: a database-backed screen & module registry, action-level permission buttons that generate ordinary `<screen>.<button>` permissions, per-user grant/deny overrides, tenant-level activity types driving sidebar/module visibility, multi-role user creation moved behind `POST /api/users`, and four dedicated `/access-control/*` management screens. All schema changes are additive; the dormant `rbac_*` tables stay untouched.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Node 20+
**Primary Dependencies**: Vite 7, TanStack Router (file-based) + TanStack Query, Zustand, shadcn/ui, Zod, React Hook Form, Supabase (Auth + Realtime), Prisma 7 (`@prisma/adapter-pg`)
**Storage**: PostgreSQL (Supabase), Prisma client generated to `src/generated/prisma/`
**Testing**: Vitest (`pnpm test`); shared pure functions unit-tested; API contract tests
**Target Platform**: Client SPA + `/api` handlers (no SSR)
**Constraints**: Additive migrations only; multi-tenant via `tenant_users.parent_tenant_id → tenant_subscriptions.id`; RTL-first UI; `no-console` lint

## Constitution Check

- [x] Package manager: pnpm; dev on port 5190.
- [x] State separation: Zustand (`useRBACStore` extension) / TanStack Query (all server state) / Context (UI only).
- [x] API style: new endpoints in `src/app/api/**/route.ts` delegating to `src/server/fns/*`; `{ success, data, error }` envelope; `requireAuth` on every handler.
- [x] Forms: React Hook Form + Zod, contracts parsed on both sides.
- [x] Feature-sliced: new `src/features/access-control/{data,components,blocks,hooks,pages}` following `src/features/users/data/*` as the canonical pattern; routes are thin wrappers.
- [x] DB: snake_case, `created_at`/`updated_at`, indexed FKs, additive migrations.

## Project Structure

### Documentation (this feature)

```text
specs/024-rbac-enhancements/
├── spec.md            # Functional spec
├── plan.md            # This file
├── research.md        # Gap analysis + decisions
├── data-model.md      # New/extended Prisma models, seeding, migrations
├── quickstart.md      # End-to-end flows (user creation, button gating, activity types)
├── tasks.md           # Phased task list
├── contracts/api.md   # API contracts
└── checklists/requirements.md
```

### Source Code (planned touch points)

```text
prisma/schema.prisma                          # 9 new models + additive extensions (data-model.md)
prisma/migrations/<ts>_rbac_enhancements/     # additive SQL + realtime publication + RLS + backfill

src/server/
├── fns/access-control-seed.ts                # ensureAccessControlSeeded() (new)
├── fns/screens.ts, buttons.ts, activity-types.ts   # new server fns
├── fns/create-user.ts                        # refactor: plain fn behind POST /api/users, roleIds[], compensation
├── fns/rbac.ts                               # permission CRUD, user overrides; extend seed defs
└── utils/auth.ts                             # getDatabasePermissionNames + user_permissions resolution

src/app/api/
├── users/route.ts                            # + POST (create user)
├── users/permissions/route.ts                # new
├── rbac/screens/route.ts, rbac/screens/access/route.ts   # new
├── rbac/buttons/route.ts, rbac/screen-buttons/route.ts   # new
├── rbac/permissions/route.ts                 # + POST/DELETE
└── tenant/activity-types/route.ts            # new

src/features/access-control/
├── data/{schema,types,actions,queries,seed-data}.ts
├── hooks/use-tenant-activity-types.ts, use-screens.ts, use-buttons.ts
├── components/can-action.tsx
└── pages/{roles,permissions,screens,buttons}-page.tsx    # roles/permissions reuse existing components

src/features/users/
├── data/rbac.ts                              # + screens.*/buttons.* perms, resolveEffectivePermissions()
├── data/{queries,store}.ts                   # + user_permissions & activity-type realtime/state
└── blocks/create-user-form.tsx, user-list.tsx  # multi-role select, role badges

src/routes/_authenticated/access-control/{roles,permissions,screens,buttons}.tsx  # new thin routes
src/components/layout/{types.ts, data/sidebar-data.ts, app-sidebar.tsx}          # module tags + composed filter
src/routes/_authenticated/route.tsx           # activity-type route context enforcement
```

## Phases (each independently shippable)

### Phase 1 — Schema & migrations (no behavior change)
New Prisma models + additive SQL migration (tables, indexes), realtime publication additions, RLS policies, `permissions.resource/action` + `roles.is_system` columns with backfill, Prisma field rename `user_roles.tenant_user_id @map("auth_user_id")` with mechanical code updates, deprecation doc comments on `rbac_*`/`employee_roles`/`res_roles`. Run `pnpm exec prisma generate` (client outputs to `src/generated/prisma/`).

### Phase 2 — Seeds
`src/features/access-control/data/seed-data.ts` (activity types, modules + activity mapping, buttons, ~35-screen registry, default screen_roles/screen_permissions/screen_buttons); `screens.*`/`buttons.manage` added to `BASE_PERMISSION_DEFINITIONS` + admin defaults; `ensureAccessControlSeeded()` with `app_settings` version guard; backfill migration for `tenant_activity_types` from `tenant_users.modules` union.

### Phase 3 — Server fns & API
New fns (`screens.ts`, `buttons.ts`, `activity-types.ts`); extend `rbac.ts` (permission CRUD, `setUserPermissionOverrides`); `getDatabasePermissionNames` + `resolveEffectivePermissions` (user grant/deny); refactor `create-user.ts` → plain fn behind `POST /api/users` with `roleIds[]` + auth-user compensation (old server fn kept one release delegating, then removed); invitations gain `roleIds[]`; all new API routes per contracts/api.md.

### Phase 4 — Client data layer
`src/features/access-control/data/*`; `useRBACStore` extensions (`activeActivityTypeCodes`, `moduleActivityMap`, effective permissions incl. overrides, screens/buttons catalog); `useTenantActivityTypes()` with realtime channel (pattern of `src/features/users/data/queries.ts`); extra realtime channels (`user_permissions`, `tenant_activity_types`); `<CanAction>`; multi-role create-user/invite forms + user-list role badges.

### Phase 5 — Management screens
Four `/access-control/*` routes + pages (Roles/Permissions pages reuse `roles-management.tsx`, `permissions-management.tsx`, `permission-editor.tsx`); remove Roles/Permissions tabs from `/users`; user-permission-override editor in the user detail; "route not implemented" badge on Screens page.

### Phase 6 — Navigation & visibility integration
`module?: string` on `NavItem` + tags in `sidebar-data.ts`; composed filter in `app-sidebar.tsx` (`subscriptionActive AND activityTypeEnabled AND canAccessItem`); route-context enforcement in `_authenticated/route.tsx`; "Access Control" nav group; sign-in module tabs derived from tenant activity types; first `<CanAction>` surfaces (orders pay/approve, POS pay).

## Risks & Open Questions

1. **Global roles/permissions in multi-tenant production** — a tenant admin editing role permissions affects all tenants (pre-existing, but the new screens expose it). Product decision required before Phase 5 ships role editing broadly; mitigation candidate: additive nullable `roles.tenant_id`/`permissions.tenant_id` with global fallback.
2. **RLS + realtime publication** — new tables must join the realtime publication and get policies, or invalidation hooks silently never fire (checklist item).
3. **Deny-precedence drift** — one shared `resolveEffectivePermissions()` used by server and client, with shared unit tests, is mandatory (SC-005).
4. **`user_roles` physical column stays `auth_user_id`** — Prisma `@map` fixes code readability, but raw SQL / Supabase-client call sites must be audited during Phase 1 (realtime filters in `queries.ts` use it today).
5. **Lazy-seed cost** — `app_settings` version guard prevents per-request upsert storms; all seed writes idempotent so concurrent first-hits are safe.
6. **Admin-registered screens are data-only** — no React route exists until a developer ships one; Screens page badges the state. Open question: generic placeholder route (`/screens/$code`) — deferred.
7. **Metadata staleness** — `user_metadata.permissions` is display-only; documented; authorization always reads the DB.
8. **Two `supabaseAdmin` clients** (`src/server/supabase.ts` vs `supabase-admin.ts`) — consolidate in Phase 3 while touching the server fns.

## Reuse Map (do not reinvent)

| Existing asset | Reused for |
|---|---|
| `ensureBasePermissionsSeeded()` (`src/server/fns/rbac.ts`) | Seeding pattern for `ensureAccessControlSeeded()` |
| `requireAuth` / `getDatabasePermissionNames` (`src/server/utils/auth.ts`) | Single enforcement point — only extended, never duplicated |
| `hasPermission` wildcards, `getPrimaryRoleName` (`src/features/users/data/rbac.ts`) | Button permissions resolve through the same helpers |
| Realtime invalidation pattern (`src/features/users/data/queries.ts`) | `user_permissions` + `tenant_activity_types` channels |
| `canAccessItem()` (`src/components/layout/app-sidebar.tsx`) | Composed with `activityTypeEnabled()` — not replaced |
| `roles-management.tsx`, `permissions-management.tsx`, `permission-editor.tsx` | Bodies of the new Roles/Permissions pages |
| `setRolePermissions` delete-then-createMany pattern | `setScreenRoles`, `setScreenPermissions`, `setUserPermissionOverrides` |
| `useHasModuleAccess` (`src/features/auth/queries.ts`) | Reimplemented atop tenant activity types, same signature |
