import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useTenantUsersStore } from '@/stores/tenant-users-store'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/use-auth'
import { profileService } from '@/features/auth/services/profile-service'
import type { OnboardingBranchInput, OnboardingUserInput } from '@/features/users/data/schema'
import type { CreatedOnboardingUser } from '@/server/fns/onboarding-users'

export interface CompleteOnboardingData {
  userId: string
  firstName: string
  lastName: string
  phone?: string
  activity: string
  paymentMethod: string
  transferRef?: string
  /** Branches to create during onboarding (Step 4) */
  branches?: OnboardingBranchInput[]
  /** Users to create during onboarding (Step 5) */
  users?: OnboardingUserInput[]
}

export interface CompleteOnboardingResult {
  success: boolean
  createdUsers?: CreatedOnboardingUser[]
  createdBranches?: Array<{ id: string; name: string }>
}

export function useCompleteOnboarding() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { setUser } = useAuthStore((state) => state.auth)

  return useMutation({
    mutationFn: async (input: CompleteOnboardingData): Promise<CompleteOnboardingResult> => {
      if (!user) throw new Error('User not found')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      }

      let createdBranches: Array<{ id: string; name: string }> | undefined
      let createdUsers: CreatedOnboardingUser[] | undefined

      // Step 1: Create branches if provided
      if (input.branches && input.branches.length > 0) {
        const branchRes = await fetch('/api/onboarding/branches', {
          method: 'POST',
          headers,
          body: JSON.stringify({ branches: input.branches }),
        })

        if (!branchRes.ok) {
          const body = await branchRes.json().catch(() => ({}))
          throw new Error(
            (body as { error?: string }).error ?? 'Failed to create branches'
          )
        }

        const branchResult = (await branchRes.json()) as {
          success: boolean
          data: Array<{ id: string; name: string; cityId: string }>
        }

        createdBranches = branchResult.data.map((b) => ({
          id: b.id,
          name: b.name,
        }))
      }

      // Step 2: Create users if provided
      if (input.users && input.users.length > 0) {
        // Map branchIds: if user selected a branch by name from Step 4, resolve the ID
        const usersWithBranches = input.users.map((u) => {
          // If branchId is set, use it directly
          if (u.branchId) return u

          return u
        })

        const userRes = await fetch('/api/onboarding/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({ users: usersWithBranches }),
        })

        if (!userRes.ok) {
          const body = await userRes.json().catch(() => ({}))
          throw new Error(
            (body as { error?: string }).error ?? 'Failed to create users'
          )
        }

        const userResult = (await userRes.json()) as {
          success: boolean
          data: {
            users: CreatedOnboardingUser[]
            errors: Array<{ email: string; error: string }>
          }
        }

        createdUsers = userResult.data.users

        // Show errors for failed users
        if (userResult.data.errors.length > 0) {
          for (const err of userResult.data.errors) {
            toast.error(`Failed to create ${err.email}: ${err.error}`)
          }
        }
      }

      // Step 3: Update profile (existing logic)
      await profileService.updateProfile(input.userId, {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone || null,
        activity: input.activity,
        payment_method: input.paymentMethod,
        transfer_ref: input.transferRef || null,
        onboarding_complete: true,
      })

      // Step 4: Update Supabase Auth user metadata
      const { data: authData, error } = await supabase.auth.updateUser({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          paymentMethod: input.paymentMethod,
          transferRef: input.transferRef || null,
          onboardingComplete: true,
        },
      })

      if (error) throw error

      // Step 5: Update Zustand store user state
      if (authData.user) {
        setUser(authData.user)
      }

      return {
        success: true,
        createdUsers,
        createdBranches,
      }
    },
    onSuccess: (result) => {
      // Sync created users to the tenant users store
      if (result.createdUsers && result.createdUsers.length > 0) {
        const store = useTenantUsersStore.getState()
        store.addTenantUsers(
          result.createdUsers.map((u) => ({
            id: u.tenantUserId,
            authUserId: u.authUserId,
            email: u.email,
            firstName: null,
            lastName: null,
            phone: null,
            role: u.roleName,
            roleNames: [u.roleName],
            roleIds: [],
            branchId: u.branchId,
            branchName: null,
            isUser: true,
            isPaid: false,
            isOwner: false,
            parentAuthUserId: user?.id ?? '',
            createdAt: new Date().toISOString(),
          }))
        )
      }

      toast.success('Account setup completed!')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({
        queryKey: ['rbac', 'current-access'],
      })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
      router.navigate({ to: '/' })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to complete account setup.')
    },
  })
}
