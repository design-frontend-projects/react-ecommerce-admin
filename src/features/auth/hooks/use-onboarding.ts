import { useUser } from '@/hooks/use-auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { profileService } from '@/features/auth/services/profile-service'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

export interface CompleteOnboardingData {
  userId: string
  firstName: string
  lastName: string
  phone?: string
  activity: string
}

export function useCompleteOnboarding() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { setUser } = useAuthStore((state) => state.auth)

  return useMutation({
    mutationFn: async (input: CompleteOnboardingData) => {
      if (!user) throw new Error('User not found')
      
      // 1. Update the user's profile in the database
      await profileService.updateProfile(input.userId, {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone || null,
        activity: input.activity,
        onboarding_complete: true,
      })

      // 2. Update Supabase Auth user metadata
      const { data: authData, error } = await supabase.auth.updateUser({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          onboardingComplete: true,
        }
      })
      
      if (error) throw error

      // 3. Update Zustand store user state
      if (authData.user) {
        setUser(authData.user)
      }
      
      return { success: true }
    },
    onSuccess: () => {
      toast.success('Account setup completed.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['rbac', 'current-access'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      router.navigate({ to: '/' })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to complete account setup.')
    },
  })
}
