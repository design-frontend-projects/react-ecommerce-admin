import type { PermissionName } from './rbac'

/**
 * Typed permission constants for server routes and client checks. Every value
 * must exist in `BASE_PERMISSION_DEFINITIONS` (enforced by
 * `tests/api/permission-constants.test.ts`). Use these instead of raw string
 * literals — `withAuth` only accepts `KnownPermission`.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'general.dashboard.view',
  USERS_VIEW: 'access_control.users.view',
  USERS_MANAGE: 'access_control.users.manage',
  ROLES_MANAGE: 'access_control.roles.manage',
  PERMISSIONS_MANAGE: 'access_control.permissions.manage',
  SETTINGS_MANAGE: 'general.settings.manage',
  PRODUCTS_VIEW: 'general.products.view',
  PRODUCTS_MANAGE: 'general.products.manage',
  INVENTORY_VIEW: 'inventory.stock.view',
  INVENTORY_MANAGE: 'inventory.stock.manage',
  ORDERS_VIEW: 'restaurant.orders.view',
  ORDERS_MANAGE: 'restaurant.orders.manage',
  ORDERS_CREATE: 'restaurant.orders.create',
  REPORTS_VIEW: 'general.reports.view',
  POS_ACCESS: 'general.pos.access',
  SCREENS_VIEW: 'access_control.screens.view',
  SCREENS_MANAGE: 'access_control.screens.manage',
  BUTTONS_MANAGE: 'access_control.buttons.manage',
  SHIFTS_USE: 'restaurant.shifts.use',
  SHIFTS_VIEW: 'restaurant.shifts.view',
  SHIFTS_MANAGE: 'restaurant.shifts.manage',
  PURCHASING_VIEW: 'inventory.purchasing.view',
  PURCHASING_MANAGE: 'inventory.purchasing.manage',
  SALES_VIEW: 'inventory.sales.view',
  SALES_MANAGE: 'inventory.sales.manage',
} as const satisfies Record<string, Exclude<PermissionName, '*'>>

export type KnownPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
