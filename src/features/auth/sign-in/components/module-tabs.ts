// Module icons for sign-in tabs
import { Package, UtensilsCrossed } from 'lucide-react'
import type { UserModule } from './sign-in.schema'

export interface ModuleTabConfig {
  id: UserModule
  label: string
  icon: typeof Package
  description: string
  gradient: string
}

export const MODULE_TABS: ModuleTabConfig[] = [
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    description: 'Manage products, categories & inventory',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: UtensilsCrossed,
    description: 'POS, orders, kitchen & reservations',
    gradient: 'from-orange-500 to-red-500',
  },
]
