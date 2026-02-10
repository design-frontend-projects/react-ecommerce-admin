// User Types for Module-based Authentication
import type { UserModule } from '@/features/auth/sign-in/components/sign-in.schema'

export interface User {
  id: string
  clerk_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  primary_module: UserModule
  modules: UserModule[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserWithRoles extends User {
  // For inventory module
  inventory_roles?: string[]
  // For restaurant module
  restaurant_roles?: string[]
}
