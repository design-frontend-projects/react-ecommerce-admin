import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { areas } from '../data/data'

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      // simulate api call
      await new Promise((resolve) => setTimeout(resolve, 500))
      return areas
    },
  })
}

export function useDeleteArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      // simulate api call
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
  })
}
