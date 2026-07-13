// ResPOS Constants
// Role and permission definitions
import type { Permission, RoleName } from '../types'
import { UserRole } from '@/types/user-role.enum'

// Backward-compatible re-export — existing `import { RoleNames }` keeps working
export { UserRole as RoleNames } from '@/types/user-role.enum'

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: RoleName[] = [
  UserRole.Kitchen,
  UserRole.Captain,
  UserRole.Cashier,
  UserRole.Admin,
  UserRole.SuperAdmin,
]

// Role display names
export const ROLE_DISPLAY_NAMES: Partial<Record<RoleName, string>> = {
  [UserRole.SuperAdmin]: 'Super Administrator',
  [UserRole.Admin]: 'Administrator',
  [UserRole.Manager]: 'Manager',
  [UserRole.Cashier]: 'Cashier',
  [UserRole.Captain]: 'Captain/Waiter',
  [UserRole.Kitchen]: 'Kitchen Staff',
  [UserRole.Staff]: 'Staff',
}

// Permission definitions
export const PERMISSIONS: Record<Permission, string> = {
  '*': 'All Permissions',
  dashboard: 'View Dashboard',
  pos: 'Access POS Screen',
  orders: 'Manage Orders',
  menu: 'Manage Menu',
  floors: 'Manage Floors & Tables',
  reservations: 'Manage Reservations',
  reservations_view: 'View Reservations',
  analytics: 'View Analytics',
  shifts: 'Manage Shifts',
  settings: 'Manage Settings',
  payments: 'Process Payments',
  void_approve: 'Approve Void Requests',
  void_request: 'Request Void Orders',
  kitchen: 'Kitchen Display',
  notifications: 'View Notifications',
}

// Role-to-permission mapping
export const ROLE_PERMISSIONS: Partial<Record<RoleName, Permission[]>> = {
  [UserRole.SuperAdmin]: ['*'],
  [UserRole.Admin]: [
    'dashboard',
    'pos',
    'orders',
    'menu',
    'floors',
    'reservations',
    'analytics',
    'shifts',
    'settings',
    'payments',
    'void_approve',
  ],
  [UserRole.Cashier]: ['dashboard', 'pos', 'orders', 'shifts', 'payments', 'void_approve'],
  [UserRole.Captain]: ['dashboard', 'pos', 'orders', 'reservations_view', 'void_request'],
  [UserRole.Kitchen]: ['dashboard', 'kitchen'],
}

// Route protection mapping
export const PROTECTED_ROUTES: Record<string, Permission[]> = {
  '/respos': ['dashboard'],
  '/respos/pos': ['pos'],
  '/respos/kitchen': ['kitchen'],
  '/respos/menu': ['menu'],
  '/respos/floors': ['floors'],
  '/respos/reservations': ['reservations', 'reservations_view'],
  '/respos/analytics': ['analytics'],
  '/respos/shifts': ['shifts'],
  '/respos/settings': ['settings'],
  '/respos/payment': ['payments'],
}

// Table status colors (Tailwind classes)
export const TABLE_STATUS_COLORS: Record<string, string> = {
  free: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  occupied:
    'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
  reserved:
    'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  dirty:
    'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
}

export const TABLE_STATUS_TEXT_COLORS: Record<string, string> = {
  free: 'text-emerald-600 dark:text-emerald-400',
  occupied: 'text-orange-600 dark:text-orange-400',
  reserved: 'text-indigo-600 dark:text-indigo-400',
  dirty: 'text-amber-600 dark:text-amber-400',
}

// Order status colors
export const ORDER_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  ready: 'bg-green-500',
  paid: 'bg-gray-500',
  void: 'bg-red-500',
  void_pending: 'bg-orange-500',
}

// Default tax rate (14% for Egypt) additional tax ضريبة القيمة المضافة
// Fallback only — the live rate comes from the tax_rates table via
// useActiveTaxRate/useTaxSync.
export const DEFAULT_TAX_RATE = 0.14

// Order channels (promotion "activity" scoping)
export const ORDER_CHANNELS = ['dine_in', 'takeaway', 'delivery'] as const

// Order number prefix
export const ORDER_NUMBER_PREFIX = 'ORD'

// Reservation table prefix
export const RESERVATION_TABLE_PREFIX = 'RES_'
