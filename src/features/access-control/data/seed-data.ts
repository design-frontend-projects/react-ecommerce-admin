/**
 * Seed definitions for the RBAC screen/module registry, permission buttons, and
 * tenant activity types (feature 024). Pure data — no server imports — consumed by
 * `ensureAccessControlSeeded()` in `src/server/fns/access-control-seed.ts`.
 *
 * Mirrors the role/permission catalog in `src/features/users/data/rbac.ts`.
 * Default screen roles are derived from the current `sidebar-data.ts` literals.
 */
import { UserRole, ADMIN_ROLES } from '@/types/user-role.enum'

export interface ActivityTypeSeed {
  code: string
  name: string
  description: string
}

export interface ModuleSeed {
  code: string
  name: string
  description: string
  sortOrder: number
  /** Empty = activity-agnostic (always visible). */
  activityTypeCodes: string[]
}

export interface ButtonSeed {
  code: string
  name: string
  description: string
}

export interface ScreenSeed {
  code: string
  name: string
  route: string
  moduleCode: string
  description?: string
  icon?: string
  /** Default `screen_roles` (role names). */
  roles: string[]
  /** Default `screen_permissions` (permission names; missing ones are skipped). */
  permissions: string[]
}

export interface ScreenButtonSeed {
  screenCode: string
  buttonCode: string
  /** Roles the generated `<screen>.<button>` permission is granted to. */
  roles: string[]
}

export const SEED_VERSION = '2'

export const ACTIVITY_TYPE_SEEDS: ActivityTypeSeed[] = [
  {
    code: 'restaurant',
    name: 'Restaurant',
    description: 'Restaurant / food & beverage point of sale',
  },
  {
    code: 'inventory',
    name: 'Inventory',
    description: 'Retail / inventory management',
  },
]

export const MODULE_SEEDS: ModuleSeed[] = [
  {
    code: 'general',
    name: 'General',
    description: 'Shared, activity-agnostic surfaces',
    sortOrder: 0,
    activityTypeCodes: [],
  },
  {
    code: 'restaurant',
    name: 'Restaurant POS',
    description: 'Restaurant point-of-sale surfaces',
    sortOrder: 1,
    activityTypeCodes: ['restaurant'],
  },
  {
    code: 'inventory',
    name: 'Inventory',
    description: 'Inventory and stock management surfaces',
    sortOrder: 2,
    activityTypeCodes: ['inventory'],
  },
  {
    code: 'lookups',
    name: 'Lookups',
    description: 'Reference data',
    sortOrder: 3,
    activityTypeCodes: [],
  },
  {
    code: 'access_control',
    name: 'Access Control',
    description: 'Users, roles, permissions, screens, buttons',
    sortOrder: 4,
    activityTypeCodes: [],
  },
  {
    code: 'system',
    name: 'System',
    description: 'System-owner surfaces',
    sortOrder: 5,
    activityTypeCodes: [],
  },
]

export const BUTTON_SEEDS: ButtonSeed[] = [
  {
    code: 'create',
    name: 'Create',
    description: 'Create records on the screen',
  },
  { code: 'update', name: 'Update', description: 'Edit records on the screen' },
  {
    code: 'delete',
    name: 'Delete',
    description: 'Delete records on the screen',
  },
  {
    code: 'approve',
    name: 'Approve',
    description: 'Approve records/actions on the screen',
  },
  {
    code: 'reject',
    name: 'Reject',
    description: 'Reject records/actions on the screen',
  },
  { code: 'pay', name: 'Pay', description: 'Take payment on the screen' },
]

const ADMINS = [...ADMIN_ROLES]

export const SCREEN_SEEDS: ScreenSeed[] = [
  // general
  {
    code: 'dashboard',
    name: 'Dashboard',
    route: '/',
    moduleCode: 'general',
    roles: [],
    permissions: ['general.dashboard.view'],
  },
  {
    code: 'pos',
    name: 'POS System',
    route: '/pos',
    moduleCode: 'general',
    roles: ADMINS,
    permissions: ['general.pos.access'],
  },
  {
    code: 'products',
    name: 'Products',
    route: '/products',
    moduleCode: 'general',
    roles: ADMINS,
    permissions: ['general.products.view'],
  },
  {
    code: 'subscriptions',
    name: 'Subscriptions',
    route: '/subscriptions',
    moduleCode: 'general',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'customers',
    name: 'Customers',
    route: '/customers',
    moduleCode: 'general',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'customer_groups',
    name: 'Customer Groups',
    route: '/customer-groups',
    moduleCode: 'general',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'customer_cards',
    name: 'Customer Cards',
    route: '/customer-cards',
    moduleCode: 'general',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'settings',
    name: 'Settings',
    route: '/settings',
    moduleCode: 'general',
    roles: ADMINS,
    permissions: ['general.settings.manage'],
  },

  // restaurant
  {
    code: 'respos_dashboard',
    name: 'POS Dashboard',
    route: '/respos',
    moduleCode: 'restaurant',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'respos_pos',
    name: 'POS Screen',
    route: '/respos/pos',
    moduleCode: 'restaurant',
    roles: [UserRole.Captain, ...ADMINS],
    permissions: ['general.pos.access'],
  },
  {
    code: 'respos_captain',
    name: 'Captain Station',
    route: '/respos/captain',
    moduleCode: 'restaurant',
    roles: [UserRole.Captain, ...ADMINS],
    permissions: [],
  },
  {
    code: 'respos_kitchen',
    name: 'Kitchen Display',
    route: '/respos/kitchen',
    moduleCode: 'restaurant',
    roles: [UserRole.Kitchen, ...ADMINS],
    permissions: [],
  },
  {
    code: 'respos_menu',
    name: 'Menu Management',
    route: '/respos/menu',
    moduleCode: 'restaurant',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'respos_floors',
    name: 'Floors & Tables',
    route: '/respos/floors',
    moduleCode: 'restaurant',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'respos_reservations',
    name: 'Reservations',
    route: '/respos/reservations',
    moduleCode: 'restaurant',
    roles: [...ADMINS, UserRole.Captain],
    permissions: [],
  },
  {
    code: 'respos_analytics',
    name: 'Analytics',
    route: '/respos/analytics',
    moduleCode: 'restaurant',
    roles: ADMINS,
    permissions: ['general.reports.view'],
  },
  {
    code: 'respos_shifts',
    name: 'Shifts',
    route: '/respos/shifts',
    moduleCode: 'restaurant',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'respos_cashier',
    name: 'Cashier Checkout',
    route: '/respos/cashier',
    moduleCode: 'restaurant',
    roles: [UserRole.Cashier, ...ADMINS],
    permissions: [],
  },
  {
    code: 'respos_payments',
    name: 'Payments',
    route: '/respos/payments',
    moduleCode: 'restaurant',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'respos_shipments',
    name: 'Shipments',
    route: '/respos/shipments',
    moduleCode: 'restaurant',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'orders',
    name: 'Orders',
    route: '/orders',
    moduleCode: 'restaurant',
    roles: ['captain', 'cashier', ...ADMINS],
    permissions: ['restaurant.orders.view'],
  },

  // inventory
  {
    code: 'inventory',
    name: 'Inventory Items',
    route: '/inventory',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: ['inventory.stock.view'],
  },
  {
    code: 'inventory_shipments',
    name: 'Inventory Shipments',
    route: '/inventory/shipments',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'stock_balances',
    name: 'Stock Balances',
    route: '/stock-balances',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: ['inventory.stock.view'],
  },
  {
    code: 'purchase_orders',
    name: 'Purchase Orders',
    route: '/purchase-orders',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'price_list',
    name: 'Price List',
    route: '/price-list',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'promotions',
    name: 'Promotions',
    route: '/promotions',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'transactions',
    name: 'Transactions',
    route: '/transactions',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'stock_transfers',
    name: 'Stock Transfers',
    route: '/stock-transfers',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: ['inventory.stock.view'],
  },
  {
    code: 'stock_adjustments',
    name: 'Stock Adjustments',
    route: '/stock-adjustments',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: ['inventory.stock.view'],
  },
  {
    code: 'inventory_movements',
    name: 'Inventory Movements',
    route: '/inventory-movements',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: ['inventory.stock.view'],
  },
  {
    code: 'suppliers',
    name: 'Suppliers',
    route: '/suppliers',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'stores',
    name: 'Stores',
    route: '/stores',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'categories',
    name: 'Categories',
    route: '/categories',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'tax_rates',
    name: 'Tax Rates',
    route: '/tax-rates',
    moduleCode: 'inventory',
    roles: ADMINS,
    permissions: [],
  },

  // lookups
  {
    code: 'countries',
    name: 'Countries',
    route: '/countries',
    moduleCode: 'lookups',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'cities',
    name: 'Cities',
    route: '/cities',
    moduleCode: 'lookups',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'currencies',
    name: 'Currencies',
    route: '/currencies',
    moduleCode: 'lookups',
    roles: ADMINS,
    permissions: [],
  },
  {
    code: 'branches',
    name: 'Branches',
    route: '/branches',
    moduleCode: 'lookups',
    roles: ADMINS,
    permissions: [],
  },

  // access control
  {
    code: 'users',
    name: 'User Management',
    route: '/users',
    moduleCode: 'access_control',
    roles: ADMINS,
    permissions: ['access_control.users.view'],
  },
  {
    code: 'roles',
    name: 'Roles',
    route: '/access-control/roles',
    moduleCode: 'access_control',
    roles: ADMINS,
    permissions: ['access_control.roles.manage'],
  },
  {
    code: 'permissions',
    name: 'Permissions',
    route: '/access-control/permissions',
    moduleCode: 'access_control',
    roles: ADMINS,
    permissions: ['access_control.permissions.manage'],
  },
  {
    code: 'screens',
    name: 'Screens Registry',
    route: '/access-control/screens',
    moduleCode: 'access_control',
    roles: ADMINS,
    permissions: ['access_control.screens.view'],
  },
  {
    code: 'buttons',
    name: 'Permission Buttons',
    route: '/access-control/buttons',
    moduleCode: 'access_control',
    roles: ADMINS,
    permissions: ['access_control.buttons.manage'],
  },

  // system (system-owner gated separately in code)
  {
    code: 'system_management',
    name: 'System Management',
    route: '/system',
    moduleCode: 'system',
    roles: [],
    permissions: [],
  },
  {
    code: 'audit_logs',
    name: 'Audit Logs',
    route: '/system/audit-logs',
    moduleCode: 'system',
    roles: [],
    permissions: [],
  },
]

export const SCREEN_BUTTON_SEEDS: ScreenButtonSeed[] = [
  {
    screenCode: 'orders',
    buttonCode: 'pay',
    roles: [UserRole.Cashier, ...ADMINS],
  },
  { screenCode: 'orders', buttonCode: 'create', roles: ['captain'] },
  { screenCode: 'orders', buttonCode: 'update', roles: ['captain'] },
  // Inventory movements: create drafts (manager+admin), approve/apply (admin)
  {
    screenCode: 'stock_transfers',
    buttonCode: 'create',
    roles: ['manager', ...ADMINS],
  },
  { screenCode: 'stock_transfers', buttonCode: 'approve', roles: ADMINS },
  {
    screenCode: 'stock_adjustments',
    buttonCode: 'create',
    roles: ['manager', ...ADMINS],
  },
  { screenCode: 'stock_adjustments', buttonCode: 'approve', roles: ADMINS },
]
