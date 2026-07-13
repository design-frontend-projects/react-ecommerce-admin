import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { fetchReservations, releaseReservation } from '../data/actions'

const reservationsKey = ['inventory', 'stock-reservations'] as const

export function useReservations() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: reservationsKey,
    queryFn: () => fetchReservations(getToken),
    enabled: isLoaded && isSignedIn,
  })
}

export function useReleaseReservation() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => releaseReservation(getToken, id),
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
