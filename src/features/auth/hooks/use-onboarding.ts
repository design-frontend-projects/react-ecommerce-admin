import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/use-auth'

export interface CompleteOnboardingData {
  userId: string
  firstName: string
  lastName: string
  phone?: string
  businessName: string
  displayName?: string
  legalName?: string
  countryId: string
  activity: string
  paymentMethod: string
  transferRef?: string
  subscriptionId: string
}

export interface CompleteOnboardingResult {
  success: boolean
  tenantId: string
  tenantCode: string
}

export function useCompleteOnboarding() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { setUser } = useAuthStore((state) => state.auth)

  return useMutation({
    mutationFn: async (
      input: CompleteOnboardingData
    ): Promise<CompleteOnboardingResult> => {
      if (!user) throw new Error('User not found')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          authUserId: input.userId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          businessName: input.businessName,
          displayName: input.displayName,
          legalName: input.legalName,
          countryId: input.countryId,
          activity: input.activity,
          paymentMethod: input.paymentMethod,
          transferRef: input.transferRef,
          subscriptionId: input.subscriptionId,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error ??
            'Failed to complete tenant setup.'
        )
      }

      const result = (await res.json()) as {
        success: boolean
        data: {
          success: boolean
          tenantId: string
          tenantCode: string
        }
      }

      // Refresh Supabase Auth user session/user state
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        setUser(authData.user)
      }

      return {
        success: true,
        tenantId: result.data.tenantId,
        tenantCode: result.data.tenantCode,
      }
    },
    onSuccess: () => {
      toast.success('Tenant account setup completed successfully!')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({
        queryKey: ['rbac', 'current-access'],
      })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      void queryClient.invalidateQueries({ queryKey: ['tenants'] })
      router.navigate({ to: '/' })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to complete account setup.')
    },
  })
}
