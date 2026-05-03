import { useEffect } from 'react'
import { useUser } from '@/lib/auth'
import { profileService } from '@/features/auth/services/profile-service'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'

export function useSyncUser() {
  console.log('use sync user funtion call');
  
  const { user, isLoaded, isSignedIn } = useUser()
  const { profile, setProfile } = useAuthStore((state) => state.auth)

  const { mutate: sync } = useMutation({
    mutationFn: (params: Parameters<typeof profileService.getOrCreateProfile>[0]) =>
      profileService.getOrCreateProfile(params),
    onSuccess: (data) => {
      setProfile(data)
    },
  })

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !profile) {
      sync({
        auth_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? user.email ?? null,
        first_name: user.firstName ?? '',
        last_name: user.lastName ?? '',
        phone: user.primaryPhoneNumber?.phoneNumber ?? '',
      })
    }
  }, [isLoaded, isSignedIn, user, profile, sync])

  return {
    isLoading: isLoaded && isSignedIn && !profile,
    profile,
  }
}
