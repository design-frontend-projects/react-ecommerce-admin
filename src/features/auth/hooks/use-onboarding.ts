import { useAuth, useSupabaseAuth } from '@/lib/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { completeOnboarding } from '@/features/users/data/actions'
import type { CompleteOnboardingInput } from '@/features/users/data/types'

export function useCompleteOnboarding() {
  const { getToken } = useAuth()
  const { refreshUser } = useSupabaseAuth()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (input: CompleteOnboardingInput) =>
      completeOnboarding(getToken, input),
    onSuccess: async () => {
      await refreshUser()
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
