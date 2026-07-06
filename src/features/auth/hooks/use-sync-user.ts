import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useUser } from '@/hooks/use-auth'
import { profileService } from '@/features/auth/services/profile-service'

export function useSyncUser() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { profile, setProfile } = useAuthStore((state) => state.auth)

  const { mutate: sync } = useMutation({
    mutationFn: (
      params: Parameters<typeof profileService.getOrCreateProfile>[0]
    ) => profileService.getOrCreateProfile(params),
    onSuccess: (data) => {
      setProfile(data)
    },
  })

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !profile) {
      sync({
        auth_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        first_name: user.firstName ?? '',
        last_name: user.lastName ?? '',
        phone: user.publicMetadata?.phone_number ?? '',
      })
    }
  }, [isLoaded, isSignedIn, user, profile, sync])

  return {
    isLoading: isLoaded && isSignedIn && !profile,
    profile,
  }
}
