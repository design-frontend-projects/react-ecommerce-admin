import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SupplierOption {
  supplier_id: number
  name: string
}

/** All suppliers for select inputs. */
export function useSupplierOptions() {
  return useQuery<SupplierOption[]>({
    queryKey: ['suppliers', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('supplier_id, name')
        .order('name')
      if (error) throw error
      return (data ?? []) as SupplierOption[]
    },
  })
}
