// ResPOS Constants
// Role and permission definitions
import type { Permission, RoleName } from '../types'

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: RoleName[] = [
  'kitchen',
  'captain',
  'cashier',
  'admin',
  'super_admin',
]

// Role display names
export const ROLE_DISPLAY_NAMES: Record<RoleName, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  cashier: 'Cashier',
  captain: 'Captain/Waiter',
  kitchen: 'Kitchen Staff',
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
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  super_admin: ['*'],
  admin: [
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
  cashier: ['dashboard', 'pos', 'orders', 'shifts', 'payments', 'void_approve'],
  captain: ['dashboard', 'pos', 'orders', 'reservations_view', 'void_request'],
  kitchen: ['dashboard', 'kitchen'],
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
  free: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  dirty: 'bg-orange-500',
}

export const TABLE_STATUS_TEXT_COLORS: Record<string, string> = {
  free: 'text-green-500',
  occupied: 'text-red-500',
  reserved: 'text-yellow-500',
  dirty: 'text-orange-500',
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

// Default tax rate (14% for Egypt)
export const DEFAULT_TAX_RATE = 0.14

// Order number prefix
export const ORDER_NUMBER_PREFIX = 'ORD'

// Reservation table prefix
export const RESERVATION_TABLE_PREFIX = 'RES_'
