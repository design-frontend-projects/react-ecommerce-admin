import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'

const api = {
  completeOnboarding: async (data: any) => {
    // In a real app this would be: await fetch('/api/users/onboarding', { method: 'POST' })
    console.log('Completing onboarding with data:', data)
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
  }
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: api.completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      toast.success('Your account is now fully set up!')
      router.navigate({ to: '/' })
    },
    onError: (error: Error) => {
      toast.error(`Error completing account setup: ${error.message}`)
    },
  })
}
