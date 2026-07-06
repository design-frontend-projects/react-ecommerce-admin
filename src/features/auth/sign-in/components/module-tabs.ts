// Module icons for sign-in tabs
import { Package, UtensilsCrossed } from 'lucide-react'
import type { UserModule } from './sign-in.schema'

export interface ModuleTabConfig {
  id: UserModule
  icon: typeof Package
  gradient: string
}

export const MODULE_TABS: ModuleTabConfig[] = [
  {
    id: 'inventory',
    icon: Package,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'restaurant',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-red-500',
  },
]
