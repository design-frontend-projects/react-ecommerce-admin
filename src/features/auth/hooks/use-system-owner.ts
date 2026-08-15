import { useAuthStore } from '@/stores/auth-store'
import { useRBACStore } from '@/features/users/data/store'

export function useSystemOwner() {
  const { profile, user } = useAuthStore((state) => state.auth)
  const { currentRoleNames } = useRBACStore()

  const isSuperAdminOwner =
    currentRoleNames.includes('super_admin') ||
    profile?.default_role === 'super_admin'
  const isSystemOwner =
    isSuperAdminOwner ||
    currentRoleNames.includes('system_owner') ||
    profile?.default_role === 'system_owner'

  return {
    isSystemOwner,
    isSuperAdminOwner,
    profile,
    user,
  }
}
