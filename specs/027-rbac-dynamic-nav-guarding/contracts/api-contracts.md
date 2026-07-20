# Feature 027 — API Contracts (delta over feature-024)

Envelope (all endpoints): `{ success: true, data }` or `{ success: false, message, error: { message } }`
(`src/server/utils/http.ts`). Auth: `Authorization: Bearer <supabase access token>`; every handler calls
`requireAuth(token, '<permission>')`. Existing RBAC/user endpoints live under `src/routes/api/`
(`users.ts`, `users/invite.ts`, `users/roles.ts`, `users/permissions.ts`, `rbac*.ts`).

## Provisioning (Part 4)

### `POST /api/users` `[EXTEND]`
- **Auth:** `users.manage`.
- **Request:** `{ email, firstName?, lastName?, phone?, roleIds: string[] (≥1), branchId?, overrides?: Array<{ permissionId: string, isGranted: boolean }> }`.
  **No `password` field** (server generates it).
- **Response `data` `[EXTEND]`:** `{ tenantUserId, authUserId, roleNames, primaryRole, temporaryPassword }`.
  `temporaryPassword` is returned **once**; it is never persisted or retrievable again.
- **Errors:** 400 (validation / duplicate email), 403 (insufficient permission).
- **Zod:** extend `createUserInputSchema` (drop `password`, keep `roleIds[]`, add `overrides`) and the
  result schema (`temporaryPassword: z.string()`) in `src/features/users/data/schema.ts`.

### `POST /api/users/:id/reset-password` (or reuse existing `changeUserPassword` server fn) `[EXTEND]`
- **Auth:** `users.manage`. Regenerates a temp password server-side, sets `force_password_change=true`,
  returns the new `temporaryPassword` once.

## Role / permission administration (Part 7) — `[EXISTS]`, referenced

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/rbac/roles` | `roles.manage`/`users.view` | roles + permissions catalog |
| `POST /api/rbac/roles` · `PATCH`/`DELETE` | `roles.manage` (delete blocked on `is_system`) | role CRUD |
| set/toggle role permissions | `roles.manage` | matrix cells (`setRolePermissions`,`toggleRolePermission`) |
| `POST /api/users/roles` | `users.manage` | assign `roleIds[]` to a user |
| `POST /api/users/permissions` | `users.manage` | per-user grant/deny overrides (`user_permissions`) |
| screens / buttons / activity-types CRUD | `screens.manage`/`buttons.manage`/`super_admin` | catalog admin (`src/server/fns/{screens,buttons,activity-types}.ts`) |

## Access resolution (Part 3 / Q5)

Recommended `[NEW]` convergence endpoint: `GET /api/rbac/me/access` → `requireAuth(token)` →
`{ roleIds, roleNames, permissionNames }` computed by the **server** resolver (includes
`user_permissions` overrides), which the client consumes instead of the direct-Supabase
`fetchCurrentUserAccess`, eliminating the client/server divergence.

## Client-side guard contract (Part 10, `[IMPLEMENTED]`)

`<RequirePermission role={string|string[]} permission={string|string[]} redirectTo="/403">` —
allows when the resolved user satisfies **either** a required role **or** a required permission
(OR semantics, matching the sidebar). Shows a spinner while resolving; redirects to `/403` when
resolved-and-denied. UX-only; the server + RLS remain authoritative.
