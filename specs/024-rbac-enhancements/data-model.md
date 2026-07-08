# Data Model: RBAC Module Enhancement

**Feature**: `024-rbac-enhancements` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

Conventions (per repo standard): snake_case tables/columns, uuid PKs `gen_random_uuid()`, `created_at`/`updated_at timestamptz default now()`, all FKs indexed (`idx_*` names), **additive migrations only**.

## Entity Relationship Overview

```text
tenant_subscriptions ──< tenant_activity_types >── business_activity_types
                                                        │
                              app_modules ──< module_activity_types
                                   │
                              app_screens ──< screen_roles >── roles ──< role_permissions >── permissions
                                   │      ──< screen_permissions >──────────────────────────────┘
                                   │      ──< screen_buttons >── permission_buttons
                                   │             │ (permission_id)                    tenant_users
                                   │             └────────────> permissions <── user_permissions ┘
                                   │                                 ▲
tenant_users ──< user_roles >── roles ──< role_permissions >─────────┘
```

Requirement §5 entity mapping:

| Spec entity | Table |
|---|---|
| User | `tenant_users` (existing) + Supabase Auth user |
| Role | `roles` (existing) |
| Permission | `permissions` (existing, extended) |
| UserRole | `user_roles` (existing) |
| RolePermission | `role_permissions` (existing) |
| Screen/Module | `app_screens` + `app_modules` (new) |
| PermissionButton | `permission_buttons` (new) |
| ScreenButtonPermission | `screen_buttons` (new) + grants via `role_permissions` / `user_permissions` |
| ActivityType | `business_activity_types` (new) |
| ModuleActivityType | `module_activity_types` (new) |

## New Models

```prisma
model business_activity_types {
  id                    String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code                  String                  @unique @db.VarChar(50) // 'restaurant' | 'inventory' (extensible)
  name                  String                  @db.VarChar(100)
  description           String?                 @db.VarChar(255)
  is_active             Boolean                 @default(true)
  created_at            DateTime?               @default(now()) @db.Timestamptz(6)
  updated_at            DateTime?               @default(now()) @db.Timestamptz(6)
  tenant_activity_types tenant_activity_types[]
  module_activity_types module_activity_types[]
}

model tenant_activity_types {
  tenant_id               String                  @db.Uuid // → tenant_subscriptions.id (the de-facto tenant anchor)
  activity_type_id        String                  @db.Uuid
  is_active               Boolean                 @default(true)
  created_at              DateTime?               @default(now()) @db.Timestamptz(6)
  updated_at              DateTime?               @default(now()) @db.Timestamptz(6)
  tenant_subscriptions    tenant_subscriptions    @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  business_activity_types business_activity_types @relation(fields: [activity_type_id], references: [id], onDelete: Cascade)

  @@id([tenant_id, activity_type_id])
  @@index([activity_type_id], map: "idx_tenant_activity_types_activity")
}

model app_modules {
  id                    String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code                  String                  @unique @db.VarChar(50) // 'general'|'restaurant'|'inventory'|'lookups'|'access_control'|'system'
  name                  String                  @db.VarChar(100)
  description           String?                 @db.VarChar(255)
  sort_order            Int                     @default(0)
  is_active             Boolean                 @default(true)
  created_at            DateTime?               @default(now()) @db.Timestamptz(6)
  updated_at            DateTime?               @default(now()) @db.Timestamptz(6)
  app_screens           app_screens[]
  module_activity_types module_activity_types[]
}

model module_activity_types {
  module_id               String                  @db.Uuid
  activity_type_id        String                  @db.Uuid
  created_at              DateTime?               @default(now()) @db.Timestamptz(6)
  app_modules             app_modules             @relation(fields: [module_id], references: [id], onDelete: Cascade)
  business_activity_types business_activity_types @relation(fields: [activity_type_id], references: [id], onDelete: Cascade)

  @@id([module_id, activity_type_id])
  @@index([activity_type_id], map: "idx_module_activity_types_activity")
}

model app_screens {
  id                 String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code               String               @unique @db.VarChar(100) // permission resource segment: snake_case, no dots (e.g. 'orders', 'purchase_orders')
  name               String               @db.VarChar(150)
  route              String               @unique @db.VarChar(255) // '/respos/pos', '/access-control/roles'
  description        String?              @db.VarChar(255)
  icon               String?              @db.VarChar(100) // lucide icon name
  module_id          String               @db.Uuid
  sort_order         Int                  @default(0)
  is_active          Boolean              @default(true)
  is_system          Boolean              @default(false) // seeded screens: not deletable; code/route locked
  created_at         DateTime?            @default(now()) @db.Timestamptz(6)
  updated_at         DateTime?            @default(now()) @db.Timestamptz(6)
  app_modules        app_modules          @relation(fields: [module_id], references: [id])
  screen_roles       screen_roles[]
  screen_permissions screen_permissions[]
  screen_buttons     screen_buttons[]

  @@index([module_id], map: "idx_app_screens_module")
}

model screen_roles {
  screen_id   String      @db.Uuid
  role_id     String      @db.Uuid
  created_at  DateTime?   @default(now()) @db.Timestamptz(6)
  app_screens app_screens @relation(fields: [screen_id], references: [id], onDelete: Cascade)
  roles       roles       @relation(fields: [role_id], references: [id], onDelete: Cascade)

  @@id([screen_id, role_id])
  @@index([role_id], map: "idx_screen_roles_role")
}

model screen_permissions {
  screen_id     String      @db.Uuid
  permission_id String      @db.Uuid
  created_at    DateTime?   @default(now()) @db.Timestamptz(6)
  app_screens   app_screens @relation(fields: [screen_id], references: [id], onDelete: Cascade)
  permissions   permissions @relation(fields: [permission_id], references: [id], onDelete: Cascade)

  @@id([screen_id, permission_id])
  @@index([permission_id], map: "idx_screen_permissions_permission")
}

model permission_buttons {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code           String           @unique @db.VarChar(50) // 'create'|'update'|'delete'|'approve'|'reject'|'pay' (extensible)
  name           String           @db.VarChar(100)
  description    String?          @db.VarChar(255)
  is_system      Boolean          @default(false)
  created_at     DateTime?        @default(now()) @db.Timestamptz(6)
  updated_at     DateTime?        @default(now()) @db.Timestamptz(6)
  screen_buttons screen_buttons[]
}

model screen_buttons {
  screen_id          String             @db.Uuid
  button_id          String             @db.Uuid
  permission_id      String             @db.Uuid // → permissions row named `${screen.code}.${button.code}`
  is_active          Boolean            @default(true)
  created_at         DateTime?          @default(now()) @db.Timestamptz(6)
  updated_at         DateTime?          @default(now()) @db.Timestamptz(6)
  app_screens        app_screens        @relation(fields: [screen_id], references: [id], onDelete: Cascade)
  permission_buttons permission_buttons @relation(fields: [button_id], references: [id], onDelete: Cascade)
  permissions        permissions        @relation(fields: [permission_id], references: [id], onDelete: Cascade)

  @@id([screen_id, button_id])
  @@index([button_id], map: "idx_screen_buttons_button")
  @@index([permission_id], map: "idx_screen_buttons_permission")
}

model user_permissions {
  tenant_user_id String       @db.Uuid // → tenant_users.id (row PK — consistent with user_roles)
  permission_id  String       @db.Uuid
  is_granted     Boolean      @default(true) // false = explicit deny
  created_at     DateTime?    @default(now()) @db.Timestamptz(6)
  updated_at     DateTime?    @default(now()) @db.Timestamptz(6)
  tenant_users   tenant_users @relation(fields: [tenant_user_id], references: [id], onDelete: Cascade)
  permissions    permissions  @relation(fields: [permission_id], references: [id], onDelete: Cascade)

  @@id([tenant_user_id, permission_id])
  @@index([permission_id], map: "idx_user_permissions_permission")
}
```

## Extensions to Existing Models (additive)

| Model | Change |
|---|---|
| `roles` | Add relation `screen_roles screen_roles[]`; add `is_system Boolean @default(false)` (protects the 7 seeded roles from deletion) |
| `permissions` | Add relations `screen_permissions[]`, `screen_buttons[]`, `user_permissions[]`; add nullable `resource VarChar(100)` + `action VarChar(50)` (backfilled by splitting `name` on the first `.`; `name` remains the unique source of truth — the columns exist so the Permissions screen can group by resource without client-side string parsing) |
| `tenant_subscriptions` | Add relation `tenant_activity_types tenant_activity_types[]` |
| `tenant_users` | Add relation `user_permissions user_permissions[]`. `modules`/`primary_module` columns are KEPT (additive-only) but demoted to derived mirrors of tenant activity types |
| `user_roles` | **Prisma-level field rename only**: `tenant_user_id String @map("auth_user_id") @db.Uuid` (+ relation field rename). Physical column unchanged; fixes the code-level misnomer. Doc comment explains the mapping |
| `rbac_*`, `employee_roles`, `res_roles` | `/// DEPRECATED — unused, superseded by the active RBAC set` doc comments; no structural change |

## Key Semantics

### Button permissions ARE permissions (D-004)

Attaching button `pay` to screen `orders` performs, in one transaction:
1. Upsert `permissions` row `name = 'orders.pay'` (description auto-generated, `resource='orders'`, `action='pay'`).
2. Upsert `screen_buttons (screen_id, button_id, permission_id)`.

Granting the button to a role = ordinary `role_permissions` row. Granting/denying per user = `user_permissions` row. Removing a button from a screen sets `screen_buttons.is_active = false` (permission row kept — additive convention; grants become inert because `<CanAction>`/handlers also check `is_active`).

**Screen codes must be snake_case with no dots** so `hasPermission()`'s `resource.action` split and `resource.*` wildcard resolution (`src/features/users/data/rbac.ts`) work unchanged.

### Effective permission resolution (shared client + server)

Precedence: **explicit user deny > explicit user grant > role grant > wildcard**.

```
effective = expand(roleDerivedNames) ∪ { p | user_permissions(granted) } − { p | user_permissions(denied) }
```

Implemented once as a pure function `resolveEffectivePermissions(rolePermissionNames, userGrants, userDenies)` in `src/features/users/data/rbac.ts`, consumed by both `getDatabasePermissionNames()` (`src/server/utils/auth.ts`) and the client store selector — preventing client/server drift.

### Module visibility semantics

- A module with **no** `module_activity_types` rows is activity-agnostic → always visible (applies to `general`, `lookups`, `access_control`, `system`).
- A module with rows is visible iff the tenant has ≥1 matching row in `tenant_activity_types` with `is_active = true`.
- Final nav visibility = `subscriptionActive AND activityTypeEnabled(module) AND canAccessItem(roles/permissions)`.

### Screen visibility rule

A user may access a screen if they hold **any** of: a role in `screen_roles`, a permission in `screen_permissions`, or a permission attached to one of the screen's active `screen_buttons`. (Button grants imply visibility — the cashier who only holds `orders.pay` still sees the orders screen, with only Pay enabled.)

## Seeding

Pattern: sibling of `ensureBasePermissionsSeeded()` (`src/server/fns/rbac.ts`) — `ensureAccessControlSeeded()` in `src/server/fns/access-control-seed.ts`, invoked lazily from catalog GET handlers. Guarded by a version key in the existing `app_settings` table (e.g. `rbac_seed_version = '2'`) to short-circuit when current; concurrent first-hits are harmless because everything is upsert/`ON CONFLICT DO NOTHING`.

Seed definitions in `src/features/access-control/data/seed-data.ts` (mirrors `src/features/users/data/rbac.ts`):

1. **Activity types**: `restaurant`, `inventory`.
2. **Modules** (matching the existing sidebar groups): `general`, `restaurant` ↔ restaurant activity, `inventory` ↔ inventory activity, `lookups`, `access_control`, `system`.
3. **Buttons** (`is_system: true`): `create`, `update`, `delete`, `approve`, `reject`, `pay`.
4. **Screens** (`is_system: true`; ~35 rows covering every existing route): dashboard `/`, pos `/pos`, products `/products`, subscriptions `/subscriptions`; respos surface (`/respos`, `/respos/pos`, `/respos/captain`, `/respos/kitchen`, `/respos/menu`, `/respos/floors`, `/respos/reservations`, `/respos/analytics`, `/respos/shifts`, `/respos/cashier`, `/respos/payments`, `/respos/shipments`); inventory surface (`/inventory`, `/stock-balances`, `/purchase-orders`, `/price-list`, `/promotions`, `/transactions`, `/suppliers`, `/stores`, `/categories`, `/tax-rates`); customers (`/customers`, `/customer-groups`, `/customer-cards`); lookups (`/countries`, `/cities`, `/currencies`, `/branches`); settings `/settings`; and the 5 management screens — users `/users`, roles `/access-control/roles`, permissions `/access-control/permissions`, screens `/access-control/screens`, buttons `/access-control/buttons`.
5. **New permissions** added to `BASE_PERMISSION_DEFINITIONS`: `screens.view`, `screens.manage`, `buttons.manage` — granted to `admin` (and covered by `super_admin`'s `*`) in `DEFAULT_ROLE_PERMISSION_NAMES`.
6. **Default `screen_roles` / `screen_permissions`**: derived from today's `sidebar-data.ts` literals (e.g. respos POS → roles `captain`, `admin`, `super_admin`) and the obvious `<resource>.view` permission.
7. **Default `screen_buttons`** (spec examples): `orders` × `pay` → permission `orders.pay` granted to `cashier` + `admin`; `orders` × `create`/`update` → `orders.create` (existing) / `orders.update` (new) granted to `captain`.

**Idempotency rule** (matches existing behavior): catalog rows are always upserted; mapping rows (`screen_roles`, `screen_permissions`, `screen_buttons`, `role_permissions`) are created only when the parent has none — admin customizations are never overwritten by re-seeds.

## Migration Steps (all additive)

1. `CREATE TABLE` × 9 new tables + indexes above.
2. `ALTER TABLE permissions ADD COLUMN resource ..., ADD COLUMN action ...` + backfill `UPDATE ... SET resource = split_part(name,'.',1), action = split_part(name,'.',2)`.
3. `ALTER TABLE roles ADD COLUMN is_system boolean NOT NULL DEFAULT false` + backfill for the 7 seeded role names.
4. **Backfill `tenant_activity_types`**: for each `tenant_subscriptions` row, insert the union of its users' `tenant_users.modules` values mapped to activity-type ids; tenants with no users (or empty unions) get **both** types — preserves current all-visible behavior.
5. Add new tables to the Supabase realtime publication (`ALTER PUBLICATION supabase_realtime ADD TABLE tenant_activity_types, user_permissions, screen_buttons, screen_roles, screen_permissions;`) — required for the existing invalidation pattern to fire.
6. RLS: enable on all new tables — service-role-only writes; tenant-scoped reads for `tenant_activity_types` (`tenant_id` = caller's tenant) and `user_permissions` (own `tenant_user_id`); authenticated reads for the global catalogs (`business_activity_types`, `app_modules`, `app_screens`, `permission_buttons`, `screen_*`).
