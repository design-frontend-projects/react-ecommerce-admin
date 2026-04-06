import { useQuery } from '@tanstack/react-query'
import { getInvoices } from '../api/get-invoices'

interface UseInvoicesOptions {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  return useQuery({
    queryKey: ['sales-invoices', options],
    queryFn: async () => {
      return getInvoices(options)
    },
    // Keep previous data when fetching a new page to avoid flashing
    placeholderData: (previousData) => previousData,
  })
}
