# Feature Specification: RBAC Module Enhancement

**Feature Branch**: `024-rbac-enhancements`
**Created**: 2026-07-08
**Status**: Draft
**Input**: User description: "Extend the current RBAC module so that Admins and Super Admins can fully manage users, roles, permissions, application screens, and action-level button permissions — and so the application's navigation dynamically reflects which business modules (based on activity type) a given account has access to."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Role User Creation (Priority: P1)

As an admin, I want to create a staff user (via Supabase admin API) and assign one or more roles at creation time, so the user is fully provisioned with correct access from their first sign-in.

**Why this priority**: User provisioning is the entry point of the whole RBAC system; today it is single-role and bypasses the API authorization layer.

**Independent Test**: Create a user with roles `[cashier, captain]` from the Users screen; verify the Supabase auth user exists, `user_roles` has 2 rows, and the user's effective permissions are the union of both roles.

**Acceptance Scenarios**:

1. **Given** an admin on the Users screen, **When** they submit the create-user form with email, temporary password, and roles `[cashier, captain]`, **Then** an auth user is created via `supabase.auth.admin.createUser`, `tenant_users`/`user_roles`/`profiles` rows are written atomically, and the user list shows both role badges.
2. **Given** the database write fails after the auth user was created, **When** the transaction rolls back, **Then** the orphaned Supabase auth user is deleted (compensation) and the admin sees a clear error.
3. **Given** a non-admin without `users.manage`, **When** they call `POST /api/users`, **Then** the API returns 403.
4. **Given** an existing user, **When** an admin edits their roles to a different set, **Then** `user_roles` is replaced with the new set and the change propagates to the user's open session in near-real-time.

---

### User Story 2 - Screen Registry Management (Priority: P1)

As an admin/app owner, I want a database-backed registry of all application screens (name, route, description, module, allowed roles, applicable permissions) that I can extend without a code-only change.

**Why this priority**: Prerequisite for button-level permissions and data-driven access rules; required by the spec's "manageable as data" constraint.

**Independent Test**: Open `/access-control/screens`, see all existing screens grouped by module; register a new screen with a route and roles; verify it appears in the registry and its access rules apply.

**Acceptance Scenarios**:

1. **Given** a fresh environment, **When** the screens catalog is first requested, **Then** the registry is auto-seeded with every existing route (~35 screens) marked `is_system`.
2. **Given** an admin with `screens.manage`, **When** they register a new screen (name, route, description, module, icon) and assign allowed roles, **Then** the screen is stored and appears in the registry; if no React route exists yet for it, the UI badges it "route not implemented".
3. **Given** a system screen, **When** an admin attempts to delete it or change its code/route, **Then** the action is blocked (system screens are edit-limited).

---

### User Story 3 - Action-Level Permission Buttons (Priority: P1)

As an admin, I want to grant specific action buttons (create, update, delete, approve, reject, pay) on specific screens to specific roles or individual users, so staff can see a screen while only their permitted actions are enabled.

**Why this priority**: Core new capability of this feature — e.g. a cashier sees the orders screen with only "Pay" enabled while a captain gets "Create"/"Update".

**Independent Test**: Enable `pay` on screen `orders` for role `cashier`; sign in as a cashier; verify the orders screen renders with only the Pay button enabled, and `POST` endpoints for other actions return 403.

**Acceptance Scenarios**:

1. **Given** an admin on `/access-control/buttons`, **When** they attach button `pay` to screen `orders`, **Then** a permission named `orders.pay` is created/linked automatically and appears in the permission catalog.
2. **Given** role `cashier` is granted `orders.pay` only, **When** a cashier opens the orders screen, **Then** the screen is visible (button grant implies visibility), the Pay button is enabled, and create/update/delete buttons are disabled or hidden.
3. **Given** a user-level explicit deny of `orders.pay`, **When** that user opens the orders screen, **Then** Pay is disabled even though their role grants it (deny wins), and the server rejects `requireAuth(token, 'orders.pay')` calls with 403.
4. **Given** an admin deactivates the `pay` button on `orders` globally, **When** any user opens the screen, **Then** the button is unavailable regardless of grants.

---

### User Story 4 - Activity-Type-Driven Navigation (Priority: P2)

As an account owner, I want the sidebar to show only the modules relevant to my account's activity types (restaurant, inventory, or both), combined with each user's role/permission access.

**Why this priority**: Delivers the dynamic navigation requirement; depends on the registry and activity-type tables from stories 1–3.

**Independent Test**: Set a tenant's activity types to `[restaurant]` only; verify inventory nav items disappear for all its users and inventory routes redirect; add `inventory` and verify the group reappears live.

**Acceptance Scenarios**:

1. **Given** a tenant with activity types `[restaurant]`, **When** any of its users signs in, **Then** the sidebar shows the Restaurant POS group but not the Inventory group, regardless of role.
2. **Given** a tenant with `[restaurant, inventory]`, **When** a user with only restaurant-role permissions signs in, **Then** the Inventory group is still hidden for them (activity type AND role/permission must both pass).
3. **Given** a user navigates directly to a URL of a module their tenant's activity types exclude, **Then** the route guard redirects them (visibility is enforced at the route level, not just the nav).
4. **Given** an admin changes the tenant's activity types in Settings, **Then** connected users' sidebars update in near-real-time without re-login.

---

### User Story 5 - Dedicated Access-Control Management Screens (Priority: P2)

As an admin, I want dedicated screens for Roles, Permissions, Screens, and Permission Buttons (instead of tabs buried in the Users page), each individually gated and registrable in the screen registry.

**Independent Test**: Navigate to each `/access-control/*` route with an admin account; verify each renders and is gated by its own permission; verify a user lacking `roles.manage` cannot open `/access-control/roles`.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they open the "Access Control" nav group, **Then** they see entries for Roles, Permissions, Screens, and Buttons, each visible only with the matching permission.
2. **Given** the Roles screen, **When** an admin creates a role and edits its permission matrix, **Then** behavior matches the current Roles tab (reused components) and updates propagate live.
3. **Given** the Permissions screen, **When** an admin views a permission, **Then** they can see which roles, screens, and buttons reference it; deleting a permission referenced by a screen button is blocked.

---

### Edge Cases

- **Role deleted while assigned**: `user_roles`/`role_permissions`/`screen_roles` rows cascade-delete; users lose that role's permissions on next resolution; seeded roles are protected by `is_system`.
- **Admin-registered screen without code route**: registry entry exists but no React route ships until a developer adds one — Screens page badges "route not implemented"; nav does not render dead links (nav rendering stays code-defined in this feature).
- **Tenant with zero activity types**: treated as all-agnostic-modules-only (restaurant + inventory groups hidden); Settings warns the owner. Backfill prevents this state for existing tenants.
- **Wildcard holders (`super_admin` = `*`)**: wildcard grants every button permission automatically; explicit user deny still wins over the wildcard.
- **Concurrent first requests racing the lazy seed**: all seed writes are upserts/`ON CONFLICT DO NOTHING`; races are harmless.
- **Stale `user_metadata.permissions`**: Supabase user metadata snapshots are display-only; authorization always reads the DB (`requireAuth`), so button permission edits take effect without metadata resync.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support the predefined roles `admin`, `super_admin`, `kitchen`, `captain`, `cashier` (plus existing `manager`, `staff`), creatable/manageable by admin or super_admin before assignment.
- **FR-002**: The system MUST allow assigning **one or more roles per user**, both at creation time and afterward, with effective permissions equal to the union of role permissions.
- **FR-003**: User creation MUST occur server-side via `supabase.auth.admin.createUser` behind `POST /api/users` gated by `requireAuth(token, 'users.manage')`, with compensation (delete orphaned auth user) if subsequent DB writes fail.
- **FR-004**: The system MUST maintain a permissions catalog independent of roles, attachable to roles (`role_permissions`), screens (`screen_permissions`), and buttons (`screen_buttons`), with standalone permission CRUD for admins.
- **FR-005**: The system MUST maintain a screen/module registry (`app_screens`, `app_modules`) storing name, route, description, icon, module, allowed roles, and applicable permissions — editable as data by admin/app owner/super_admin, and auto-seeded with all existing screens.
- **FR-006**: The system MUST provide a permission-button catalog seeded with `create`, `update`, `delete`, `approve`, `reject`, `pay`, and a screen×button mapping that auto-creates one permission named `<screen_code>.<button_code>` per mapping.
- **FR-007**: Button access MUST be grantable to roles (via `role_permissions`) and to individual users (via `user_permissions` with grant/deny), with precedence: user deny > user grant > role grant > wildcard.
- **FR-008**: Button-gated UI actions MUST render via a `<CanAction screen action mode>` primitive (`disable` or `hide` mode), and the corresponding API endpoints MUST enforce the same permission via `requireAuth`.
- **FR-009**: The system MUST model business activity types (`restaurant`, `inventory`, extensible) at the **tenant level** (`tenant_activity_types` keyed by `tenant_subscriptions.id`), with module↔activity-type mapping (`module_activity_types`).
- **FR-010**: Sidebar/navigation MUST show a module only when (a) the tenant's activity types enable it AND (b) the user's roles/permissions allow it AND (c) the subscription is active; modules without activity mapping are activity-agnostic.
- **FR-011**: Activity-type-excluded modules MUST also be unreachable by direct URL (route-level enforcement mirrors nav filtering).
- **FR-012**: Dedicated management screens MUST exist for Roles, Permissions, Screens registry, and Permission Buttons under `/access-control/*`, each gated by its own permission and registered in the screen registry; the Users screen remains at `/users` and gains multi-role assignment.
- **FR-013**: Access changes (roles, role permissions, user overrides, tenant activity types, screen buttons) MUST propagate to signed-in users in near-real-time using the existing Supabase Realtime invalidation pattern.
- **FR-014**: All schema changes MUST be additive; the dormant `rbac_*`, `employee_roles`, and `res_roles` tables remain untouched apart from deprecation comments.

### Screens To Add or Enhance

| Route | Screen | Purpose | Access |
|---|---|---|---|
| `/_authenticated/users` (existing, enhanced) | User Management | List/create/invite users with **multi-role** select; role badges; per-user permission overrides editor | `users.view` (page), `users.manage` (mutations) |
| `/_authenticated/access-control/roles` (new) | Roles Management | Role CRUD + role↔permission matrix (reuses `roles-management.tsx`, `permission-editor.tsx`) | `roles.manage` |
| `/_authenticated/access-control/permissions` (new) | Permissions Management | Permission catalog CRUD grouped by resource; shows referencing roles/screens/buttons | `permissions.manage` |
| `/_authenticated/access-control/screens` (new) | Screens Registry | List by module; register/edit screens; edit allowed roles & applicable permissions; system screens edit-limited | `screens.view` / `screens.manage` |
| `/_authenticated/access-control/buttons` (new) | Permission Buttons | Button catalog CRUD + screen×button grid with role/user grants | `buttons.manage` |
| Sidebar (enhanced) | — | New "Access Control" nav group; composed activity-type + role/permission filtering | per-item permissions |

New feature domain: `src/features/access-control/{data,components,blocks,hooks,pages}` following the canonical `src/features/users/data/*` pattern. Routes are thin wrappers mounting feature pages, per repo convention.

### Key Entities *(see data-model.md for full definitions)*

- **business_activity_types** — tenant-facing activity taxonomy (`restaurant`, `inventory`).
- **tenant_activity_types** — which activities an account has (tenant anchor: `tenant_subscriptions.id`).
- **app_modules / module_activity_types** — module registry and its activity mapping.
- **app_screens / screen_roles / screen_permissions** — screen registry with allowed roles and applicable permissions.
- **permission_buttons / screen_buttons** — action catalog and per-screen mapping; each mapping owns a generated `<screen>.<button>` permission.
- **user_permissions** — per-user grant/deny overrides.
- Existing: `tenant_users`, `roles`, `permissions`, `user_roles`, `role_permissions` (extended, never restructured).

## Success Criteria *(mandatory)*

- **SC-001**: 100% of user creations go through `POST /api/users` with `requireAuth`; direct client invocation of the create-user server fn is removed; zero orphaned auth users after simulated DB failures (compensation verified by test).
- **SC-002**: Every existing application route is represented in the seeded screen registry; the Screens page lists them grouped by module with their access rules.
- **SC-003**: For the seeded example, a `cashier` sees the orders screen with only `pay` enabled and receives 403 on non-granted action endpoints; a `captain` gets `create`/`update` on the same screen.
- **SC-004**: A tenant configured `[restaurant]`-only shows zero inventory nav items to all its users and redirects direct inventory URLs; enabling `inventory` restores them without re-login (≤ a few seconds via realtime).
- **SC-005**: Effective-permission resolution is a single shared function used by both the server gate and the client guards — no divergent logic paths (verified by shared unit tests).
- **SC-006**: All migrations are additive; existing role/permission checks (`requireAuth`, `<Can>`, `<RBACGuard>`, sidebar filtering) keep passing their current behavior for unchanged data.

## Assumptions

- **A-001**: `tenant_subscriptions.id` is the tenant/account identifier (already used via `tenant_users.parent_tenant_id`); no new tenant entity is introduced.
- **A-002**: `roles` and `permissions` remain **global** (not tenant-scoped) in this feature; tenant-scoping is flagged as a product decision (see plan.md Risks) before role editing is exposed to non-system-owner tenant admins in multi-tenant production.
- **A-003**: Navigation rendering remains code-defined (`sidebar-data.ts` + i18n); the registry drives access rules and admin visibility management, not nav rendering itself (full DB-driven nav is a follow-up).
- **A-004**: Invitations (`/api/users/invite`) adopt the same `roleIds[]` multi-role input as direct creation.
- **A-005**: Existing sign-in module tabs derive their options from tenant activity types and are hidden for single-activity tenants.
