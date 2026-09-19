import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getAuthTenantAndUser } from '@/lib/client-tenant'
import type {
  TaxRate,
  TaxRateInput,
  TaxRateFilterState,
  TaxRateStats,
} from '../types'
import { getTaxRateValidity } from '../utils/tax-math'

export type { TaxRate, TaxRateInput }

interface RawTaxRateRecord {
  id?: string
  tax_rate_id?: number | string
  tax_type: string
  rate: number | string
  country_id: string | null
  description: string | null
  effective_from: string
  effective_to: string | null
  is_active: boolean | null
  is_inclusive: boolean | null
  tenant_id?: string
  created_at?: string
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  countries?: {
    id?: string
    name: string
    code: string
  } | null
}

function normalizeTaxRate(row: RawTaxRateRecord): TaxRate {
  const resolvedId = String(row.id || row.tax_rate_id || '')
  return {
    id: resolvedId,
    tax_rate_id: resolvedId,
    tax_type: row.tax_type,
    rate: Number(row.rate ?? 0),
    country_id: row.country_id,
    description: row.description || null,
    effective_from: row.effective_from,
    effective_to: row.effective_to || null,
    is_active: row.is_active ?? true,
    is_inclusive: row.is_inclusive ?? false,
    tenant_id: row.tenant_id,
    created_at: row.created_at,
    created_by_user_id: row.created_by_user_id,
    updated_by_user_id: row.updated_by_user_id,
    countries: row.countries
      ? {
          id: row.countries.id || (row.country_id ?? ''),
          name: row.countries.name,
          code: row.countries.code,
        }
      : null,
  }
}

export const useTaxRates = (filters?: Partial<TaxRateFilterState>) => {
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['tax-rates', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('tax_rates')
        .select('*, countries:countries(id, name, code)')
        .order('created_at', { ascending: false })

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      if (filters?.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters?.status === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (filters?.mode === 'inclusive') {
        query = query.eq('is_inclusive', true)
      } else if (filters?.mode === 'exclusive') {
        query = query.eq('is_inclusive', false)
      }

      if (filters?.country_id && filters.country_id !== 'all') {
        query = query.eq('country_id', filters.country_id)
      }

      const { data, error } = await query

      if (error) throw error

      let normalized = (data as unknown as RawTaxRateRecord[]).map(normalizeTaxRate)

      // In-memory filter for validity and client search text
      if (filters?.validity && filters.validity !== 'all') {
        normalized = normalized.filter(
          (rate) =>
            getTaxRateValidity(rate.effective_from, rate.effective_to) ===
            filters.validity
        )
      }

      if (filters?.search && filters.search.trim() !== '') {
        const queryTerm = filters.search.trim().toLowerCase()
        normalized = normalized.filter(
          (rate) =>
            rate.tax_type.toLowerCase().includes(queryTerm) ||
            (rate.description &&
              rate.description.toLowerCase().includes(queryTerm)) ||
            (rate.countries &&
              (rate.countries.name.toLowerCase().includes(queryTerm) ||
                rate.countries.code.toLowerCase().includes(queryTerm)))
        )
      }

      return normalized
    },
  })
}

export const useTaxRateStats = (rates?: TaxRate[]): TaxRateStats => {
  return useMemo(() => {
    if (!rates || rates.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        avgActiveRate: 0,
        inclusiveCount: 0,
        exclusiveCount: 0,
        jurisdictionsCount: 0,
      }
    }

    const total = rates.length
    const activeRates = rates.filter((r) => r.is_active)
    const active = activeRates.length
    const inactive = total - active

    const sumRate = activeRates.reduce((acc, curr) => acc + curr.rate, 0)
    const avgActiveRate = active > 0 ? Number((sumRate / active).toFixed(2)) : 0

    const inclusiveCount = rates.filter((r) => r.is_inclusive).length
    const exclusiveCount = total - inclusiveCount

    const uniqueCountries = new Set(
      rates.map((r) => r.country_id).filter((c): c is string => Boolean(c))
    )

    return {
      total,
      active,
      inactive,
      avgActiveRate,
      inclusiveCount,
      exclusiveCount,
      jurisdictionsCount: uniqueCountries.size,
    }
  }, [rates])
}

export const useCreateTaxRate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newRate: TaxRateInput) => {
      const { tenantId, userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        tax_type: newRate.tax_type,
        rate: newRate.rate,
        country_id: newRate.country_id || null,
        description: newRate.description || null,
        effective_from: newRate.effective_from,
        effective_to: newRate.effective_to || null,
        is_active: newRate.is_active,
        is_inclusive: newRate.is_inclusive,
      }

      if (tenantId) {
        payload.tenant_id = tenantId
      }
      if (userId) {
        payload.created_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('tax_rates')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      queryClient.invalidateQueries({ queryKey: ['respos', 'tax-rate'] })
    },
  })
}

export const useUpdateTaxRate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: TaxRateInput & { id: string | number }) => {
      const { userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        tax_type: updates.tax_type,
        rate: updates.rate,
        country_id: updates.country_id || null,
        description: updates.description || null,
        effective_from: updates.effective_from,
        effective_to: updates.effective_to || null,
        is_active: updates.is_active,
        is_inclusive: updates.is_inclusive,
      }

      if (userId) {
        payload.updated_by_user_id = userId
      }

      const targetId = String(id)
      const { data, error } = await supabase
        .from('tax_rates')
        .update(payload)
        .eq('id', targetId)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      queryClient.invalidateQueries({ queryKey: ['respos', 'tax-rate'] })
    },
  })
}

export const useToggleTaxRateStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string | number
      isActive: boolean
    }) => {
      const { userId } = getAuthTenantAndUser()
      const targetId = String(id)
      const { data, error } = await supabase
        .from('tax_rates')
        .update({
          is_active: isActive,
          ...(userId ? { updated_by_user_id: userId } : {}),
        })
        .eq('id', targetId)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      queryClient.invalidateQueries({ queryKey: ['respos', 'tax-rate'] })
    },
  })
}

export const useDuplicateTaxRate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sourceRate: TaxRate) => {
      const { tenantId, userId } = getAuthTenantAndUser()
      const payload: Record<string, unknown> = {
        tax_type: `${sourceRate.tax_type} (Copy)`,
        rate: sourceRate.rate,
        country_id: sourceRate.country_id || null,
        description: sourceRate.description
          ? `Duplicated from ${sourceRate.tax_type}: ${sourceRate.description}`
          : `Duplicated from ${sourceRate.tax_type}`,
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: sourceRate.effective_to || null,
        is_active: false, // Default duplicated rates to inactive for safety
        is_inclusive: sourceRate.is_inclusive,
      }

      if (tenantId) {
        payload.tenant_id = tenantId
      }
      if (userId) {
        payload.created_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('tax_rates')
        .insert(payload)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
    },
  })
}

export const useDeleteTaxRate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string | number) => {
      const targetId = String(id)
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', targetId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      queryClient.invalidateQueries({ queryKey: ['respos', 'tax-rate'] })
    },
  })
}

export const useBulkDeleteTaxRates = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return
      const { error } = await supabase.from('tax_rates').delete().in('id', ids)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      queryClient.invalidateQueries({ queryKey: ['respos', 'tax-rate'] })
    },
  })
}

export const useBulkToggleTaxRates = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      isActive,
    }: {
      ids: string[]
      isActive: boolean
    }) => {
      if (ids.length === 0) return
      const { userId } = getAuthTenantAndUser()
      const { error } = await supabase
        .from('tax_rates')
        .update({
          is_active: isActive,
          ...(userId ? { updated_by_user_id: userId } : {}),
        })
        .in('id', ids)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      queryClient.invalidateQueries({ queryKey: ['respos', 'tax-rate'] })
    },
  })
}
