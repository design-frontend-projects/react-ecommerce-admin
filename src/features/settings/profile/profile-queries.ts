import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
} from '@/server/fns/users'

async function requireSessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Your session is not available. Please sign in again.')
  }
  return token
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const sessionToken = await requireSessionToken()
      return getUserProfile({ data: { userId: userId!, sessionToken } })
    },
    enabled: !!userId,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      userId: string
      firstName: string
      lastName: string
      phone?: string
    }) => {
      const sessionToken = await requireSessionToken()
      return updateUserProfile({ data: { ...data, sessionToken } })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { userId: string; password: string }) => {
      const sessionToken = await requireSessionToken()
      return changeUserPassword({ data: { ...data, sessionToken } })
    },
  })
}
