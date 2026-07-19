-- RBAC refactor phase 2: rename permissions to the canonical 3-part
-- `module.resource.action` taxonomy (modules mirror the access-control module
-- catalog). Renames are IN PLACE and id-preserving — role_permissions /
-- user_permissions / screen_buttons reference permissions by id, so no
-- assignment changes. `resource` becomes `module.resource`, `action` stays the
-- final segment.
--
-- The mapping mirrors LEGACY_PERMISSION_ALIASES in
-- src/features/users/data/rbac.ts (kept in lockstep by a vitest parity test).
-- Application code accepts both spellings during the transition.
--
-- Idempotent: a row is renamed only when the old name exists and the new name
-- does not (re-running or racing the app-level self-heal is safe).

DO $$
DECLARE
  mapping text[][] := ARRAY[
    ['dashboard.view',            'general.dashboard.view'],
    ['users.view',                'access_control.users.view'],
    ['users.manage',              'access_control.users.manage'],
    ['roles.manage',              'access_control.roles.manage'],
    ['permissions.manage',        'access_control.permissions.manage'],
    ['settings.manage',           'general.settings.manage'],
    ['products.view',             'general.products.view'],
    ['products.manage',           'general.products.manage'],
    ['inventory.view',            'inventory.stock.view'],
    ['inventory.manage',          'inventory.stock.manage'],
    ['orders.view',               'restaurant.orders.view'],
    ['orders.manage',             'restaurant.orders.manage'],
    ['orders.create',             'restaurant.orders.create'],
    ['reports.view',              'general.reports.view'],
    ['pos.access',                'general.pos.access'],
    ['screens.view',              'access_control.screens.view'],
    ['screens.manage',            'access_control.screens.manage'],
    ['buttons.manage',            'access_control.buttons.manage'],
    ['shifts.use',                'restaurant.shifts.use'],
    ['shifts.view',               'restaurant.shifts.view'],
    ['shifts.manage',             'restaurant.shifts.manage'],
    ['purchasing.view',           'inventory.purchasing.view'],
    ['purchasing.manage',         'inventory.purchasing.manage'],
    ['sales.view',                'inventory.sales.view'],
    ['sales.manage',              'inventory.sales.manage'],
    ['orders.pay',                'restaurant.orders.pay'],
    ['orders.update',             'restaurant.orders.update'],
    ['stock_transfers.create',    'inventory.stock_transfers.create'],
    ['stock_transfers.approve',   'inventory.stock_transfers.approve'],
    ['stock_adjustments.create',  'inventory.stock_adjustments.create'],
    ['stock_adjustments.approve', 'inventory.stock_adjustments.approve']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY mapping LOOP
    UPDATE "permissions"
    SET
      "name" = pair[2],
      -- resource = everything before the last dot, action = last segment
      "resource" = substring(pair[2] from '^(.*)\.[^.]+$'),
      "action" = substring(pair[2] from '([^.]+)$'),
      "updated_at" = now()
    WHERE "name" = pair[1]
      AND NOT EXISTS (
        SELECT 1 FROM "permissions" p2 WHERE p2."name" = pair[2]
      );
  END LOOP;
END $$;
