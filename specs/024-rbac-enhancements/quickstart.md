# Quickstart: RBAC Module Enhancement

**Feature**: `024-rbac-enhancements` | **Spec**: [spec.md](./spec.md)

End-to-end walkthroughs of the three headline flows. These double as manual verification scripts.

## Flow 1 — Create a staff user with multiple roles

1. Sign in as an admin (holds `users.manage`). Open **Users** (`/users`) → **Create user**.
2. Fill email, temporary password, first/last name; in the **Roles** multi-select pick `cashier` and `captain` (roles must already exist — role creation is a prerequisite, never inline).
3. Submit → client hook calls `POST /api/users` with the bearer token.
4. Server path:
   - `requireAuth(token, 'users.manage')` → 403 for anyone else.
   - Validates both `roleIds` exist and are active; rejects duplicate email.
   - Derives the new user's `modules` from the caller-tenant's `tenant_activity_types`.
   - `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'cashier', roles: ['cashier','captain'], ... } })`.
   - One `prisma.$transaction`: `tenant_users` (default_role = primary by `ROLE_PRIORITY`), `user_roles` × 2, `profiles`.
   - **If the transaction fails**: the just-created auth user is deleted (compensation) and the error is returned — no orphans.
   - Post-commit: non-fatal `user_metadata` roles/permissions sync (display-only).
5. Verify: user list shows two role badges; `SELECT count(*) FROM user_roles WHERE ...` = 2; signing in as the new user yields the union of cashier+captain permissions.
6. Change roles later: user row → edit roles multi-select → `POST /api/users/roles { userId, roleIds }`; the open session updates in seconds via the existing `user_roles` realtime channel.

## Flow 2 — Gate a button: cashier gets only "Pay" on Orders

1. As admin, open **Access Control → Buttons** (`/access-control/buttons`).
2. In the screen×button grid, enable `pay` for screen `orders` → server transaction upserts permission **`orders.pay`** and the `screen_buttons` row.
3. Open **Access Control → Roles** → role `cashier` → permission matrix → grant `orders.pay` (ordinary `role_permissions` row). Grant `orders.create`/`orders.update` to `captain`.
4. Sign in as a cashier and open the orders screen:
   - The screen is visible (holding any screen-button permission implies visibility).
   - `<CanAction screen="orders" action="pay" mode="disable">` renders Pay enabled; create/update/delete render disabled (or hidden with `mode="hide"`).
5. Server side needs nothing new: the pay endpoint calls `requireAuth(token, 'orders.pay')`; a captain calling it gets 403.
6. Per-user exception: user detail → permission overrides → deny `orders.pay` for one cashier → deny wins over the role grant (and over `*`), client and server alike via the shared `resolveEffectivePermissions()`.

## Flow 3 — Activity types drive the sidebar

1. As the account owner, open **Settings** → activity types → select `restaurant` only → `PUT /api/tenant/activity-types`.
2. All the tenant's connected users see the **Inventory** nav group disappear within seconds (realtime channel on `tenant_activity_types`), regardless of their roles; **Restaurant POS** stays, still filtered per-user by role/permission.
3. Navigating directly to `/inventory` redirects — the `_authenticated` route context enforces the same rule as the nav.
4. Add `inventory` back → the group reappears live; sign-in module tabs now offer both again (they're hidden while the tenant has a single activity type).
5. Composition rule everywhere: `subscriptionActive AND activityTypeEnabled(module) AND canAccessItem(roles/permissions)` — modules without an activity mapping (`general`, `lookups`, `access_control`, `system`) are activity-agnostic.

## Registering a new screen (data-only)

1. **Access Control → Screens** → **Register screen**: name, route, description, module, icon; assign allowed roles / applicable permissions.
2. The screen participates in access rules and the registry immediately; until a developer ships the React route it is badged **"route not implemented"** (nav rendering remains code-defined in this feature).

## Verification commands

```bash
pnpm exec prisma generate          # after schema changes (client → src/generated/prisma/)
pnpm exec prisma migrate dev       # apply additive migrations
pnpm test                          # incl. resolveEffectivePermissions + seed idempotency + contract tests
pnpm lint && pnpm build
```
