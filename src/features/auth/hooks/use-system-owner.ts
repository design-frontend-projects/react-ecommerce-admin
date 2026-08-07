import { useAuthStore } from '@/stores/auth-store'

export function useSystemOwner() {
  const { profile } = useAuthStore((state) => state.auth)

  const isSystemOwner = !!profile?.system_owner
  const isSuperAdminOwner = isSystemOwner && profile?.role === 'super_admin'

  return {
    isSystemOwner,
    isSuperAdminOwner,
    profile,
  }
}
