import {
  Shield,
  UserCheck,
  Users,
  CreditCard,
  User,
  UserRound,
  Utensils,
} from 'lucide-react'
import { type UserStatus } from './schema'
import { UserRole } from '@/types/user-role.enum'

export const callTypes = new Map<UserStatus, string>([
  ['active', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['inactive', 'bg-neutral-300/40 border-neutral-300'],
  ['invited', 'bg-sky-200/40 text-sky-900 dark:text-sky-100 border-sky-300'],
  [
    'suspended',
    'bg-destructive/10 dark:bg-destructive/50 text-destructive dark:text-primary border-destructive/10',
  ],
])

export const roles = [
  {
    label: 'Superadmin',
    value: UserRole.SuperAdmin,
    icon: Shield,
  },
  {
    label: 'Admin',
    value: UserRole.Admin,
    icon: UserCheck,
  },
  {
    label: 'Manager',
    value: UserRole.Manager,
    icon: Users,
  },
  {
    label: 'Cashier',
    value: UserRole.Cashier,
    icon: CreditCard,
  },
  {
    label: 'Captain',
    value: UserRole.Captain,
    icon: User,
  },
  {
    label: 'Staff',
    value: UserRole.Staff,
    icon: UserRound,
  },
  {
    label: 'Kitchen',
    value: UserRole.Kitchen,
    icon: Utensils,
  },
] as const
