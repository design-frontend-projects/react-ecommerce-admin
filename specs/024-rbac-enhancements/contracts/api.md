# API Contracts: RBAC Module Enhancement

**Feature**: `024-rbac-enhancements` | **Spec**: [../spec.md](../spec.md)

Conventions (unchanged from existing handlers):
- Next-style handlers in `src/app/api/**/route.ts`, thin — delegate to `src/server/fns/*`.
- Every handler: `getBearerToken(request)` → `requireAuth(token, '<permission>')`.
- Response envelope: `{ success: boolean, data: T | null, error: string | null }`.
- All request bodies and responses have Zod schemas in `src/features/access-control/data/schema.ts` (client re-parses responses).

## 1. Users

### `POST /api/users` — create user (NEW; replaces client-invoked `createUserDirect`)

Permission: `users.manage`

Request:
```jsonc
{
  "email": "staff@example.com",
  "password": "temp-secret-1",       // min 6
  "firstName": "Sara",
  "lastName": "K",
  "phone": "+201000000000",          // optional
  "roleIds": ["<uuid>", "<uuid>"],   // min 1 — MULTI-ROLE
  "branchId": "<uuid>"               // optional
}
```

Response `data`:
```jsonc
{ "tenantUserId": "<uuid>", "authUserId": "<uuid>", "roleNames": ["cashier","captain"], "primaryRole": "cashier" }
```

Behavior contract:
1. Validate all `roleIds` exist and `is_active`.
2. Reject duplicate `tenant_users.email` (409-style error in envelope).
3. Derive `modules` for the new user from the caller-tenant's active `tenant_activity_types` (no hard-coding).
4. `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: primaryRole, roles, onboardingComplete: false, invitedViaRbac: true } })`.
5. `prisma.$transaction`: create `tenant_users` (`default_role = primaryRole`, `parent_tenant_id` from caller), `user_roles.createMany(roleIds)`, `profiles.create`.
6. On transaction failure: best-effort `auth.admin.deleteUser(authUserId)` (compensation), rethrow.
7. Post-commit non-fatal: sync `user_metadata` roles/permissions (display-only).

### `GET /api/users` — existing, unchanged contract (`users.view`); response gains `roleIds[]`/`roleNames[]` already present.

### `POST /api/users/roles` — existing (`users.manage`), unchanged: `{ userId, roleIds: string[] }` replaces the user's role set. UI now actually sends >1.

### `POST /api/users/invite` — existing (`users.manage`), extended: `roleId` → `roleIds: string[]` (min 1); invitation metadata carries all role names; acceptance assigns all.

### `PUT /api/users/permissions` — user permission overrides (NEW)

Permission: `users.manage`

Request:
```jsonc
{
  "tenantUserId": "<uuid>",
  "grants": ["<permissionId>", "..."],   // is_granted = true
  "denies": ["<permissionId>", "..."]    // is_granted = false (deny wins)
}
```
Behavior: delete-then-createMany within the user's rows (same pattern as `setRolePermissions`). Response `data`: the user's resolved effective permission names.

## 2. RBAC catalog

### `/api/rbac` — existing, unchanged (GET catalog `users.view`; POST/PATCH/DELETE roles `roles.manage`). `DELETE` additionally blocked for `roles.is_system = true`.

### `/api/rbac/permissions` — extended

- `PUT` (existing, `permissions.manage`): `{ roleId, permissionIds[] }` role↔permission mapping.
- `POST` (NEW, `permissions.manage`): create standalone permission `{ name: "resource.action", description? }` — name validated against `/^[a-z0-9_]+\.[a-z0-9_]+$/`; `resource`/`action` columns derived.
- `DELETE ?id=` (NEW, `permissions.manage`): blocked when referenced by `screen_buttons` (must detach the button first); cascade removes `role_permissions`/`screen_permissions`/`user_permissions`.

## 3. Screens registry

### `/api/rbac/screens` (NEW) → `src/server/fns/screens.ts`

- `GET` (`screens.view`): full registry — modules with screens, each screen's roles, permissions, buttons. Triggers `ensureAccessControlSeeded()`.
  ```jsonc
  { "modules": [{ "id","code","name","sortOrder","activityTypeCodes": ["restaurant"],
      "screens": [{ "id","code","name","route","description","icon","isSystem","isActive",
                    "roleIds": [], "permissionIds": [], "buttons": [{ "buttonId","code","permissionId","permissionName","isActive" }] }] }] }
  ```
- `POST` (`screens.manage`): register screen `{ code, name, route, description?, icon?, moduleId, sortOrder? }` — `code` validated `/^[a-z0-9_]+$/` (permission resource segment), `route` unique.
- `PATCH` (`screens.manage`): update; for `is_system` screens only `name`, `description`, `icon`, `sort_order`, `is_active` are mutable (code/route locked).
- `DELETE ?id=` (`screens.manage`): blocked for `is_system` screens.

### `PUT /api/rbac/screens/access` (NEW, `screens.manage`)

```jsonc
{ "screenId": "<uuid>", "roleIds": ["..."], "permissionIds": ["..."] }
```
Replaces `screen_roles` and `screen_permissions` for the screen (delete-then-createMany, mirroring `setRolePermissions`).

## 4. Permission buttons

### `/api/rbac/buttons` (NEW) → `src/server/fns/buttons.ts`

- `GET` (`screens.view`): button catalog.
- `POST`/`PATCH`/`DELETE` (`buttons.manage`): catalog CRUD; `is_system` buttons (the 6 seeded) not deletable.

### `PUT /api/rbac/screen-buttons` (NEW, `buttons.manage`)

```jsonc
{ "screenId": "<uuid>", "buttonIds": ["<uuid>", "..."] }
```
Transaction per added button: upsert `permissions` row `name = <screen.code>.<button.code>` (backfill `resource`/`action`), upsert `screen_buttons` with that `permission_id`, reactivate if previously deactivated. Buttons absent from `buttonIds` are set `is_active = false` (permission row retained; grants become inert).

## 5. Tenant activity types

### `/api/tenant/activity-types` (NEW) → `src/server/fns/activity-types.ts`

- `GET` (any authenticated user): the caller-tenant's active activity types + the global module↔activity map (for client-side nav filtering).
  ```jsonc
  { "activityTypeCodes": ["restaurant"],
    "moduleActivityMap": { "restaurant": ["restaurant"], "inventory": ["inventory"] } } // modules absent from map = activity-agnostic
  ```
- `PUT` (`settings.manage`): `{ activityTypeCodes: string[] }` — replaces the tenant's `tenant_activity_types` rows; also refreshes the derived `tenant_users.modules` mirrors for the tenant's users.

`POST /api/tenant/onboard` (existing) is extended to insert initial `tenant_activity_types` from the module chosen at onboarding.

## Enforcement note (server-wide, not a new endpoint)

`getDatabasePermissionNames(userId)` in `src/server/utils/auth.ts` additionally reads `user_permissions` for the tenant user and applies `resolveEffectivePermissions(rolePerms, grants, denies)` before returning — every existing `requireAuth(token, 'x.y')` call site (including future button permissions like `orders.pay`) picks up user-level grant/deny automatically with no signature change.
