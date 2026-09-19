export interface CountryBrief {
  id: string
  name: string
  code: string
}

export interface TaxRate {
  id: string
  /** Backward-compatibility alias for legacy code expecting tax_rate_id */
  tax_rate_id?: string | number
  tax_type: string
  rate: number
  country_id: string | null
  description: string | null
  effective_from: string
  effective_to: string | null
  is_active: boolean
  is_inclusive: boolean
  tenant_id?: string
  created_at?: string
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  countries?: CountryBrief | null
}

export interface TaxRateInput {
  tax_type: string
  rate: number
  country_id?: string | null
  description?: string | null
  effective_from: string
  effective_to?: string | null
  is_active: boolean
  is_inclusive: boolean
}

export type TaxRateValidity = 'current' | 'upcoming' | 'expired'

export interface TaxRateFilterState {
  search: string
  status: 'all' | 'active' | 'inactive'
  mode: 'all' | 'inclusive' | 'exclusive'
  validity: 'all' | 'current' | 'upcoming' | 'expired'
  country_id: string | 'all'
}

export type TaxDialogType =
  | 'create'
  | 'edit'
  | 'delete'
  | 'view'
  | 'calculator'
  | 'bulk-delete'
  | null

export const initialFilterState: TaxRateFilterState = {
  search: '',
  status: 'all',
  mode: 'all',
  validity: 'all',
  country_id: 'all',
}

export interface TaxRateStats {
  total: number
  active: number
  inactive: number
  avgActiveRate: number
  inclusiveCount: number
  exclusiveCount: number
  jurisdictionsCount: number
}

export interface TaxCalculationResult {
  grossAmount: number
  netAmount: number
  taxAmount: number
  effectiveRate: number
  isInclusive: boolean
  unitTax: number
  formula: string
}

export interface TaxPreset {
  id: string
  label: string
  tax_type: string
  rate: number
  is_inclusive: boolean
  description: string
  country_code?: string
  badgeText?: string
}
