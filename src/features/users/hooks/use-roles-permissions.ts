import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'


const api = {
  getPermissions: async () => {
    return new Promise<any[]>((resolve) =>
      setTimeout(
        () =>
          resolve([
            { id: '1', name: 'read:users', description: 'Can read users' },
            { id: '2', name: 'write:users', description: 'Can create/edit users' },
            { id: '3', name: 'delete:users', description: 'Can delete users' },
          ]),
        500
      )
    )
  },
  updateUserRole: async (data: { userId: string; role: string }) => {
    console.log('Updating user role:', data)
    return new Promise<{ success: boolean }>((resolve) =>
      setTimeout(() => resolve({ success: true }), 800)
    )
  },
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: api.getPermissions,
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User role updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Error updating role: ${error.message}`)
    },
  })
}
