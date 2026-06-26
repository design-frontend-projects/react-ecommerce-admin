import { useUser } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { profileService } from '@/features/auth/services/profile-service'
import type { CompleteOnboardingInput } from '@/features/users/data/types'

export function useCompleteOnboarding() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (input: CompleteOnboardingInput) => {
      if (!user) throw new Error('User not found')
      
      // Update the user's profile in the database
      await profileService.updateProfile(input.clerkId, {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
      })

      // Update Clerk user's unsafeMetadata since publicMetadata might require backend
      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata as Record<string, unknown>),
          onboardingComplete: true,
        },
      })
      
      return { success: true }
    },
    onSuccess: async () => {
      await user?.reload()
      toast.success('Account setup completed.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['rbac', 'current-access'] })
      router.navigate({ to: '/' })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to complete account setup.')
    },
  })
}
