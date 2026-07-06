import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
} from '@/server/fns/users'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getUserProfile({ data: { userId: userId! } }),
    enabled: !!userId,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      userId: string
      firstName: string
      lastName: string
      phone?: string
    }) => updateUserProfile({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      changeUserPassword({ data }),
  })
}
