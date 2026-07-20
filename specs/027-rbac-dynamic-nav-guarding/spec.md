# Feature 027 — Multi-Tenant RBAC, Dynamic Navigation & User Provisioning

**Status:** Draft · **Type:** Developer-handoff specification (design only, except Part 10 which is implemented)
**Baseline:** Extends **feature-024 access-control catalog** (`specs/024-rbac-enhancements/`). Read that first.
**Scope decisions (locked):** (1) deliver spec + implement Part 10 route guarding; (2) tenancy =
**global catalog + per-tenant grants**; (3) frame as an extension of feature-024, not greenfield.

> ### How to read this document
> The master prompt asked for a from-scratch design, but this platform (**Bluewave POS**) already
> implements ~90% of the target model. Every table/flow below is therefore tagged:
> **`[EXISTS]`** (ship as-is), **`[EXTEND]`** (small additive change), **`[NEW]`** (does not exist),
> **`[IMPLEMENTED]`** (built in this feature). No SQL DDL — prose + tables only. Migrations are
> **additive** per repo convention (`prisma/schema.prisma`, `snake_case`, `created_at`/`updated_at`,
> index all FKs).

---

## Part 1 — Core RBAC Data Model (ER overview)

The catalog is a **global platform catalog** (shared across tenants); **assignments** are the tenant
boundary. This mirrors the current schema and is the recommended posture (see Open Questions Q2 for the
full-tenant-cloning alternative).

| # | Target concept (prompt) | Status | Existing table | Notes |
|---|---|---|---|---|
| 1 | `modules` | `[EXISTS]` | `app_modules` | Global. `code` unique, `sort_order`, `is_active`. |
| 2 | `screens` | `[EXISTS]` | `app_screens` | Global. Has `route` (unique), `icon`, `module_id`, `is_system`. |
| 3 | `module_screens` link | `[EXISTS]` | FK `app_screens.module_id` → `app_modules.id` | **1:many chosen** (a screen belongs to exactly one module — simpler resolution, matches nav tree). See Q6. |
| 4 | `permissions` | `[EXISTS]` | `permissions` | Global catalog. `name` unique = `resource.action`; `resource`/`action` denormalized. |
| 5 | `screen_permissions` | `[EXISTS]` | `screen_permissions` | Which permissions gate a screen (catalog of what's possible). |
| 6 | `roles` | `[EXISTS]` | `roles` | Global. `is_system` protects the 7 seeded roles. Platform (`admin`,`super_admin`) + app roles coexist here (no `is_platform` column today — see Q7). |
| 7 | `role_screen_permissions` (grant) | `[EXTEND]` | `role_permissions` (+ coarse `screen_roles`) | Grants live at role×permission. Screen-buttons already synthesize `<screen>.<button>` permissions, so role×screen×permission is expressible **without a new table**. See Q6. |
| 8 | `screen_buttons` | `[EXISTS]` | `screen_buttons` (+ `permission_buttons` catalog) | Each button binds to a `permission_id` named `<screen>.<button>`. |
| 9 | `module_activity_types` | `[EXISTS]` | `module_activity_types` (+ `business_activity_types`, `tenant_activity_types`) | Drives **which modules apply to a tenant's business activity** (restaurant vs inventory), not an audit log. Audit is a separate concern — see Q8. |
| 10 | `user_roles` | `[EXISTS]` | `user_roles` | ⚠️ `tenant_user_id` maps to physical column `auth_user_id` but FKs `tenant_users.id` (the row PK), **not** the Supabase uid. |
| 11 | `user_screen_overrides` | `[EXTEND]` | `user_permissions` (grant/deny via `is_granted`) | Per-user overrides exist at the **permission** level, not screen level. Reuse rather than add a table. See Q6. |

**Tenant boundary:** `tenant_users.parent_tenant_id` → `tenant_subscriptions.id` is the tenant
discriminator; `tenant_activity_types` is the only per-tenant catalog-enablement table. Everything in
the catalog (modules/screens/permissions/roles) is global.

**Delete/cascade behavior `[EXISTS]`:** all join tables (`role_permissions`, `screen_permissions`,
`screen_roles`, `screen_buttons`, `module_activity_types`, `user_roles`, `user_permissions`) FK with
`onDelete: Cascade`. `is_system` rows (roles, screens, buttons) are delete-protected in the server fns
(`createRole`/`deleteRole`/`deletePermission` in `src/server/fns/rbac.ts`). Deleting a `permission`
referenced by a `screen_button` is blocked.

**Hot-path indexes `[EXISTS]`/`[EXTEND]`:** `permissions.name` unique; `app_screens.route` unique;
FKs indexed (`screen_id`, `permission_id`, `role_id`, `module_id`). The resolution query filters by
`tenant_users.auth_user_id` — ensure that column is indexed `[EXTEND]` (verify in schema; add if absent).

---

## Part 2 — Table / column definitions (deltas only)

Full existing columns are in `prisma/schema.prisma`. This feature adds **only** the following, all
additive:

| Table | Column `[status]` | Type | Purpose |
|---|---|---|---|
| `tenant_users` **or** `profiles` | `force_password_change` `[NEW]` | bool, default `false` | Set true when an admin provisions a user with a temp password; enforced at first sign-in (Part 4). |
| `tenant_users` | `password_set_at` `[NEW, optional]` | timestamptz null | Audit of when the user last rotated their password. |

> Everything else in Parts 1/5 reuses existing columns. Notably **no `temporary_password` column is
> added** — the plaintext temp password is returned once in the API response and never persisted
> (Open Questions Q1).

---

## Part 3 — Effective permission-resolution algorithm `[EXISTS]`

Authoritative implementation: `resolveEffectivePermissions` in `src/features/users/data/rbac.ts`,
used verbatim by both server (`src/server/utils/auth.ts` → `getDatabasePermissionNames`) and client.
**Deny-by-default.** Given `user_id` (Supabase uid), resolve:

1. Load the user's `tenant_users` row (`where auth_user_id = user_id`) → `user_roles` → `roles` →
   `role_permissions` → `permissions`; **and** `user_permissions` → `permissions`.
2. `roleNames` ← normalized role names. `roleGrants` ← union of all role permission names.
3. **Wildcard:** if any role's default grant set contains `'*'` (e.g. `super_admin`), add `'*'`.
4. Split `user_permissions` into **user grants** (`is_granted=true`) and **user denies**
   (`is_granted=false`).
5. Compose with precedence **user-deny > user-grant > role-grant > wildcard**. A wildcard holder with
   specific denies expands `'*'` to the full permission universe, then subtracts the denies.
6. A check `hasAnyPermission(effective, required)` is wildcard-aware (`*` and `resource.*`).

**Precedence table:**

| Role grant | User grant | User deny | Effective |
|---|---|---|---|
| ✓ | – | – | **Allow** |
| ✓ | – | ✓ | **Deny** (deny wins) |
| ✗ | ✓ | – | **Allow** (override up) |
| ✗ | ✓ | ✓ | **Deny** |
| `*` (wildcard) | – | ✓ (specific) | Allow all **except** the denied key |

**Multiple roles:** grants are unioned (most-permissive), then user denies subtract. **Primary role**
for display is chosen by `ROLE_PRIORITY` (`super_admin > admin > manager > cashier > captain > kitchen > staff`).

> **Known divergence (Q5):** the client bootstrap `fetchCurrentUserAccess`
> (`src/features/users/data/queries.ts`) computes role grants + wildcard but **omits `user_permissions`
> overrides**, so the client can be more permissive than the server. UI is UX-only, so this is safe
> today, but the two paths should converge (recommended: expose a single server endpoint the client
> consumes, or add the override step client-side).

---

## Part 4 — User provisioning sequence

Target: admin creates a user server-side, assigns roles, and reveals a temp credential once.
**Most of the path already exists**; the temp-password/reveal/force-reset parts are `[NEW]`.

Sequence (Admin UI → server → Supabase → DB → response → dialog):

1. **Admin UI** — a single consolidated "Add User" dialog `[EXTEND]` (today there are three redundant
   dialogs — consolidate per Q9). Fields: email, first/last name, phone, `roleIds[]` (multi-role —
   server already supports it), optional per-user permission overrides, branch. **No password field**
   (server generates it).
2. **`POST /api/users`** `[EXISTS]` — `requireAuth(token, 'users.manage')`
   (`src/routes/api/users.ts`). Rejects if caller lacks the permission (server-authoritative).
3. **Temp-password generation** `[NEW]` — **server-side only**, in `createUser`
   (`src/server/fns/create-user.ts`): cryptographically-random, **≥16 chars**, ≥1 each of
   upper/lower/digit/symbol, generated with a CSPRNG. Never logged, never persisted in plaintext.
4. **`supabaseAdmin.auth.admin.createUser`** `[EXISTS]` — with `email_confirm: true`, the generated
   `password`, and `user_metadata` `[EXTEND]` including `force_password_change: true`.
5. **DB writes in one `prisma.$transaction`** `[EXISTS]` — `tenant_users.create` → `user_roles.createMany`
   → `profiles.create` → **`user_permissions.createMany`** for any overrides `[EXTEND]`. On failure,
   the orphaned auth user is deleted (compensation already implemented).
6. **Response** `[EXTEND]` — `CreateUserResult` gains `temporaryPassword` (returned **once**, only in
   this response body); the result Zod schema in `src/features/users/data/schema.ts` adds the field.
7. **Reveal-once dialog** `[NEW]` — shown on mutation `onSuccess`, displays email + temp password with
   **copy-to-clipboard** and **share** (native share sheet / existing notification channel). On close,
   the credential is cleared from component state and **not retrievable again** (admin must reset to
   issue a new one).
8. **Forced rotation** `[NEW]` — at first sign-in, if `user_metadata.force_password_change === true`
   (or the `force_password_change` column), the app routes to a mandatory change-password screen before
   any protected route renders; clearing the flag requires a successful password update via
   `changeUserPassword` (`src/server/fns/users.ts`).

> **Security note (Q1):** returning the plaintext once + forcing reset is the recommended pattern.
> Storing even a temporary plaintext password at rest is an anti-pattern and is **explicitly rejected**
> here. The prompt's "persist plaintext" option is surfaced as a decision, not adopted.

---

## Part 5 — Dynamic, permission-aware sidebar

**Today `[EXISTS]`:** `useSidebarData()` returns a **static nav array**
(`src/components/layout/data/sidebar-data.ts`); `AppSidebar` filters it via `canAccessItem` against the
RBAC store (`src/components/layout/app-sidebar.tsx`). Items carry inline `roles?`/`permissions?`.

**Target `[EXTEND]`, phased:**

- **Source of truth** — replace the static array with the DB catalog: join resolved roles →
  `role_permissions`/`user_permissions` → `screen_permissions` → `app_screens` → `app_modules`,
  filtered to the tenant's enabled `tenant_activity_types`. Payload shape:
  `Module → Screen[] { route, icon, requiredPermissions } → ScreenButton[] { requiredPermission }`.
- **Where computed** — **client-side via the RBAC store**, which is already hydrated on session load and
  kept fresh by **Supabase Realtime** (`useCurrentUserAccess` subscribes to `profiles`, `user_roles`,
  `tenant_users`, `role_permissions`). Recommended over server-computed because: the stack is a client
  SPA (no SSR entry wired — see CLAUDE.md), Realtime already gives near-instant invalidation, and
  TanStack Query caches with a 60s `staleTime`.
- **Cache invalidation on mid-session permission change** — already solved: an admin editing a role's
  permissions fires a `role_permissions` postgres_changes event → query invalidation → refetch → store
  update → sidebar + guards re-render. Add a visible `RoleSyncToast` (already exists) so the user knows
  access changed.
- **Migration path** — keep the static array as a fallback ordering/icon source; drive
  *visibility* from the catalog first, then retire the static `roles`/`permissions` fields once every
  screen has `screen_permissions` rows.

**Bug fixed this feature `[IMPLEMENTED]`:** `canAccessItem` previously ran dotted permission keys
through `normalizeRoleName` (built for role names), silently breaking permission-based nav visibility.
Now uses wildcard-aware `hasAnyPermission` (`src/components/layout/app-sidebar.tsx`).

---

## Part 6 — Route & access guarding (defense-in-depth, 3 layers)

Single source of truth = **server `requireAuth` + Postgres RLS**. The client layers are UX/defense.

1. **Client route guard `[IMPLEMENTED]`** — `<RequirePermission role permission redirectTo>`
   (`src/components/rbac/require-permission.tsx`). Reads the RBAC access cache (no duplicate Realtime
   channels), shows a spinner while resolving (deny-by-default, no unauthorized flash), and on
   *resolved-and-denied* redirects to **`/403`** (the existing `ForbiddenError` page). Uses the same
   `hasAnyPermission`/`normalizeRoleName` helpers and the same **OR semantics** as the sidebar, so a
   route is reachable exactly when its nav entry is visible. Applied to `users`, `respos/shifts`,
   `respos/analytics` as the reference set; remaining routes adopt it incrementally, keyed off
   `app_screens.route` → `screen_permissions`.
2. **Server / API guard `[EXISTS]`** — every `src/routes/api/**` handler calls
   `requireAuth(token, 'perm')`; unauthorized → **403** envelope. This rejects direct API calls even if
   the client guard is bypassed.
3. **Database RLS `[EXISTS]`** — Supabase RLS policies scope rows by tenant/owner so a bypassed
   frontend/API check still cannot read unentitled data.
4. **UI element guard `[EXISTS]`** — `<Can>` / `<RBACGuard>` hide buttons; the same permission the
   button checks is enforced server-side when the action is invoked.

**Decision surfaced (Q3):** unauthorized authenticated users get an **explicit 403** (not a silent
redirect that hides screen existence). This is deliberate for an internal admin tool where obscuring
routes adds little and a clear "you lack permission X" aids support. Unauthenticated users still
redirect to `/sign-in` (existing behavior).

**Keeping layers in sync:** all layers consume the **same permission keys** (`resource.action`) and the
**same resolver**. The server is authoritative; client guards must never grant more than the server.

---

## Part 7 — Admin management screens (UI/UX spec)

All under a "Access Control" area; **view** requires the listed permission, **destructive** actions
require `super_admin` (or the `.manage` permission) and are blocked on `is_system` rows. Most backing
server fns already exist (`src/server/fns/{rbac,screens,buttons,activity-types,create-user}.ts`).

| # | Screen | Purpose | List columns | Create/Edit fields | Validation | Min role: view / modify |
|---|---|---|---|---|---|---|
| 1 | **Modules** `[EXISTS bk]` | CRUD `app_modules` | code, name, #screens, active | code, name, description, sort_order, active | code unique, snake_case | `screens.view` / `screens.manage` |
| 2 | **Screens** `[EXISTS bk]` | CRUD `app_screens` + link module + route | code, name, module, route, active | code, name, module_id, route, icon, sort_order | route unique, must start `/` | `screens.view` / `screens.manage` |
| 3 | **Permissions catalog** `[EXISTS bk]` | CRUD `permissions` | name, resource, action, #roles | name (`resource.action`), description | matches `^[a-z0-9_]+\.[a-z0-9_]+$` | `permissions.manage` |
| 4 | **Screen-permission mapping** `[EXISTS bk]` | assign applicable perms to a screen | screen, permission | multi-select permissions per screen | no duplicate pair | `screens.manage` |
| 5 | **Roles** `[EXISTS bk]` | CRUD `roles` (platform vs app) | name, description, is_system, #users | name, description, active | name unique; `is_system` not deletable | `roles.manage` (delete: `super_admin`) |
| 6 | **Role × screen × permission matrix** `[EXTEND]` | grid to grant `role_permissions` | rows=screens/perms, cols=roles, cells=checkbox | toggles map to `setRolePermissions`/`toggleRolePermission` | wildcard roles read-only | `roles.manage` |
| 7 | **Module activity types** `[EXISTS bk]` | CRUD `module_activity_types` taxonomy | module, activity type | module_id, activity_type_id | no duplicate pair | `super_admin` |
| 8 | **User management** `[EXTEND]` | list/create (Part 4), assign roles, per-user overrides | name, email, roles, status, branch | Part 4 fields + `roleIds[]` + overrides | email unique; ≥1 role | `users.view` / `users.manage` |
| 9 | **Screen buttons** `[EXISTS bk]` | CRUD `screen_buttons` → required permission | screen, button, permission, active | screen_id, button_id, permission_id | unique (screen,button); auto perm `<screen>.<button>` | `buttons.manage` |

`[EXISTS bk]` = backend server fns exist; the admin **UI** may be partial and is the primary build work.

---

## Part 8 — Non-functional requirements checklist

- [ ] **Multi-tenancy isolation** — assignments (`user_roles`, `user_permissions`,
  `tenant_activity_types`) scoped by tenant; RLS enforces row scope. Catalog is intentionally global (Q2).
- [ ] **Auditability** `[NEW]` — log who changed a role's permissions, when, and the diff. Recommended:
  an `rbac_audit` append-only table (actor, action, target, before/after JSON, timestamp) written by the
  mutation server fns; surfaced in the existing `/system/audit-logs` screen. (Distinct from
  `module_activity_types`, which is taxonomy, not audit — Q8.)
- [ ] **Performance** — resolution runs per protected route load; already cached in the Zustand store +
  TanStack Query (60s stale) + Realtime invalidation. Server resolution is a single indexed query.
- [ ] **Security** — service-role key (`VITE_SUPABASE_SECRET_KEY`) used **only** in
  `src/server/**`; `src/lib/prisma.ts` throws in the browser. Temp password: server-generated,
  return-once, never persisted/logged (Q1).
- [ ] **Extensibility** — adding a module/screen/permission/button is **data-only** (rows +
  `screen_permissions`), no deploy. Idempotent seeders (`ensureAccessControlSeeded`) never overwrite
  admin customizations.

---

## Part 9 — Open Questions

- **Q1 — Plaintext temp-password storage.** Recommendation: **return once + force reset, never persist.**
  The prompt's "store plaintext" option is rejected as an anti-pattern.
- **Q2 — Catalog scoping.** Chosen: **global catalog + per-tenant grants** (lowest migration risk,
  matches current schema). Alternative (full tenant-cloned catalog with `tenant_id` on
  roles/screens/permissions) is a major migration touching every RBAC table + RLS — deferred.
- **Q3 — Forbidden vs silent redirect.** Chosen: explicit **403** for authorized-but-forbidden;
  `/sign-in` redirect for unauthenticated.
- **Q4 — Sidebar cache strategy.** Chosen: client store + TanStack Query (60s) + Supabase Realtime
  invalidation (already wired). Revisit if permission-change propagation latency is unacceptable.
- **Q5 — Client/server resolution divergence.** Client omits `user_permissions` overrides; converge by
  consuming a single server-computed access endpoint or replicating the override step client-side.
- **Q6 — `role_screen_permissions` / `user_screen_overrides` as new tables?** Recommendation:
  **reuse `role_permissions` + `user_permissions`** (screen-buttons already synthesize
  `<screen>.<button>` permissions). Add dedicated screen-scoped tables only if per-screen (not
  per-permission) overrides become a real requirement.
- **Q7 — Platform vs tenant role flag.** `roles` has no `is_platform`/`scope` column; `admin`/`super_admin`
  are distinguished only by name/`is_system`. Consider a `scope` enum if tenants get custom roles.
- **Q8 — `module_activity_types` intent.** Confirmed today = module↔business-activity taxonomy (drives
  tenant module enablement), **not** an audit/notification trigger. If audit is wanted, use the separate
  `rbac_audit` table (Q Part 8).
- **Q9 — Three redundant create/invite dialogs** (`users-action-dialog`, `blocks/create-user-form`,
  `users-invite-dialog`) and the deprecated `createUserDirect` path — consolidate to one dialog +
  `POST /api/users`.
- **Q10 — Two overlapping error-route systems** (`src/routes/(errors)/*` standalone vs
  `_authenticated/errors/$error`). Pick one for consistency; Part 10 uses `/403`.

---

## Part 10 — Route-guard & forbidden-redirect enhancement `[IMPLEMENTED]`

Delivered in this feature (code, not just spec):

1. **`src/components/rbac/require-permission.tsx`** `[NEW]` — the `<RequirePermission>` guard (Part 6.1).
2. **Route wiring** — `src/routes/_authenticated/users/route.tsx`,
   `.../respos/shifts.tsx`, `.../respos/analytics.tsx` wrapped with the guard using each route's existing
   sidebar role/permission keys.
3. **Sidebar bugfix** — `src/components/layout/app-sidebar.tsx` now matches permissions with
   `hasAnyPermission` (Part 5).
4. **Forbidden page** — reuses existing `ForbiddenError` at `/403`
   (`src/features/errors/forbidden.tsx`). Optional enhancement (deferred): pass the missing permission
   via a search param and display "You need permission: X".
5. **Lint cleanup** — removed leftover `console.log` in `src/features/users/hooks/use-rbac.ts`.

**Follow-ups (not in this feature):** temp-password generation + reveal dialog + force-reset (Part 4),
the role×permission matrix UI (Part 7.6), catalog-driven sidebar (Part 5), `rbac_audit` (Part 8), and
converging client/server resolution (Q5).
