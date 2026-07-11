// Fetches the active tax rate for the POS from the admin-managed `tax_rates`
// table. Selection rule: the single active row with the most recent
// effective_from whose window covers now. There is no store/branch binding
// yet (future upgrade path: res_settings.tax_rate_id); multi-jurisdiction
// tenants are out of scope. On error or empty result the POS falls back to
// DEFAULT_TAX_RATE, exclusive.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ActiveTaxRate {
  tax_rate_id: number
  rate: number
  is_inclusive: boolean
}

export async function fetchActiveTaxRate(): Promise<ActiveTaxRate | null> {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('tax_rates')
    .select('tax_rate_id, rate, is_inclusive, effective_from')
    .eq('is_active', true)
    .lte('effective_from', nowIso)
    .or(`effective_to.is.null,effective_to.gte.${nowIso}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    tax_rate_id: data.tax_rate_id,
    rate: Number(data.rate),
    is_inclusive: !!data.is_inclusive,
  }
}

export function useActiveTaxRate() {
  return useQuery({
    queryKey: ['respos', 'tax-rate', 'active'],
    queryFn: fetchActiveTaxRate,
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
  })
}
