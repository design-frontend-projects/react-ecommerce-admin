import { useQuery } from '@tanstack/react-query'
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
