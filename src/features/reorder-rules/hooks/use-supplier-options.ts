import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SupplierOption {
  id: string
  supplier_id: string
  name: string
  code?: string | null
}

/** All suppliers for select inputs. */
export function useSupplierOptions() {
  return useQuery<SupplierOption[]>({
    queryKey: ['suppliers', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        supplier_id: row.id,
        name: row.name,
        code: row.code,
      })) as SupplierOption[]
    },
  })
}
