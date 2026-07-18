import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { useAuthMutation } from '@/hooks/use-auth-mutation'
import { fetchReservations, releaseReservation } from '../data/actions'

const reservationsKey = ['inventory', 'stock-reservations'] as const

export function useReservations() {
  return useAuthQuery({
    queryKey: reservationsKey,
    queryFn: (getToken) => fetchReservations(getToken),
    rbac: { permission: 'orders.view' },
  })
}

export function useReleaseReservation() {
  const queryClient = useQueryClient()
  return useAuthMutation({
    mutationFn: (getToken, id: string) => releaseReservation(getToken, id),
    rbac: { permission: 'orders.manage' },
    onSuccess: () => {
      toast.success('Reservation released. Stock is available again.')
      void queryClient.invalidateQueries({ queryKey: reservationsKey })
      void queryClient.invalidateQueries({
        queryKey: ['inventory', 'sales-orders'],
      })
    },
    onError: (error: Error) =>
      toast.error('Unable to release reservation', {
        description: error.message,
      }),
  })
}
