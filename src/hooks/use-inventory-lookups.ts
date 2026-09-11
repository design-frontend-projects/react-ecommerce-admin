import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled, useAuthQuery } from '@/hooks/use-auth-query'
import { authorizedRequest } from '@/lib/authorized-request'

export interface StoreOption {
  store_id: string
  name: string | null
}

export interface WarehouseOption {
  id: string
  name: string
  code: string
}

export interface WarehouseLocationOption {
  id: string
  warehouse_id: string
  code: string
  name: string | null
  location_type: string
}

export interface SupplierOption {
  id: string
  name: string
  code: string | null
}

export interface CustomerOption {
  id: string
  first_name: string
  last_name: string
  phone?: string | null
  code?: string | null
}

export interface VariantOption {
  id: string
  sku: string
  barcode?: string | null
  price: number | string
  cost_price: number | string | null
  products?: { id?: string; product_id?: number | string; name: string } | null
}

/** All warehouses for select inputs */
export function useWarehouseOptions() {
  return useAuthQuery<WarehouseOption[]>({
    queryKey: ['warehouses', 'options'],
    rbac: { permission: 'inventory.stock.view' },
    queryFn: async (getToken) => {
      try {
        const payload = (await authorizedRequest(
          getToken,
          '/api/inventory/warehouses'
        )) as { success?: boolean; data?: Array<{ id: string; name: string; code: string; is_active?: boolean }> }
        if (payload?.data && Array.isArray(payload.data)) {
          return payload.data
            .filter((w) => w.is_active !== false)
            .map((w) => ({
              id: w.id,
              name: w.name,
              code: w.code,
            }))
        }
      } catch (err) {
        console.warn('API /api/inventory/warehouses fallback to Supabase:', err)
      }
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as WarehouseOption[]
    },
  })
}

/** Locations inside a specific warehouse */
export function useWarehouseLocationOptions(warehouseId?: string) {
  return useAuthQuery<WarehouseLocationOption[]>({
    queryKey: ['warehouse-locations', 'options', warehouseId ?? 'all'],
    enabled: Boolean(warehouseId),
    rbac: { permission: 'inventory.stock.view' },
    queryFn: async (getToken) => {
      if (!warehouseId) return []
      try {
        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/warehouses/locations?warehouseId=${encodeURIComponent(warehouseId)}`
        )) as {
          success?: boolean
          data?: Array<{
            id: string
            warehouse_id: string
            code: string
            name: string | null
            location_type: string
            is_active?: boolean
          }>
        }
        if (payload?.data && Array.isArray(payload.data)) {
          return payload.data
            .filter((loc) => loc.is_active !== false)
            .map((loc) => ({
              id: loc.id,
              warehouse_id: loc.warehouse_id,
              code: loc.code,
              name: loc.name,
              location_type: loc.location_type,
            }))
        }
      } catch (err) {
        console.warn('API /api/inventory/warehouses/locations fallback to Supabase:', err)
      }
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('id, warehouse_id, code, name, location_type')
        .eq('is_active', true)
        .eq('warehouse_id', warehouseId)
        .order('code')
      if (error) throw error
      return (data ?? []) as WarehouseLocationOption[]
    },
  })
}

/** All suppliers for select inputs */
export function useSupplierOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<SupplierOption[]>({
    queryKey: ['suppliers', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as SupplierOption[]
    },
    enabled: authEnabled,
  })
}

/** All customers for select inputs */
export function useCustomerOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<CustomerOption[]>({
    queryKey: ['customers', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .eq('is_active', true)
        .order('first_name')
      if (error) throw error
      return (data ?? []) as CustomerOption[]
    },
    enabled: authEnabled,
  })
}

/** All stores for select inputs. */
export function useStoreOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<StoreOption[]>({
    queryKey: ['stores', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('store_id, name')
        .order('name')
      if (error) throw error
      return (data ?? []) as StoreOption[]
    },
    enabled: authEnabled,
  })
}

/** On-hand quantity per variant for a store (for stocktake discrepancy display). */
export function useStoreOnHand(storeId?: string) {
  return useAuthQuery<Record<string, number>>({
    queryKey: ['stock-balances', 'on-hand', storeId ?? ''],
    enabled: Boolean(storeId),
    rbac: { permission: 'inventory.stock.view' },
    queryFn: async (getToken) => {
      if (!storeId) return {}
      try {
        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/stock-balances?storeId=${encodeURIComponent(storeId)}`
        )) as { items?: Array<{ product_variant_id: string; qty_on_hand: number | string }> }
        if (payload?.items && Array.isArray(payload.items)) {
          const map: Record<string, number> = {}
          for (const row of payload.items) {
            map[row.product_variant_id] = Number(row.qty_on_hand)
          }
          return map
        }
      } catch (err) {
        console.warn('API /api/inventory/stock-balances fallback to Supabase:', err)
      }
      const { data, error } = await supabase
        .from('stock_balances')
        .select('product_variant_id, qty_on_hand')
        .eq('store_id', storeId as string)
      if (error) throw error
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        map[(row as { product_variant_id: string }).product_variant_id] =
          Number((row as { qty_on_hand: number | string }).qty_on_hand)
      }
      return map
    },
  })
}

/** On-hand quantity per variant for a warehouse. */
export function useWarehouseOnHand(warehouseId?: string) {
  return useAuthQuery<Record<string, number>>({
    queryKey: ['stock-balances', 'on-hand-warehouse', warehouseId ?? ''],
    enabled: Boolean(warehouseId),
    rbac: { permission: 'inventory.stock.view' },
    queryFn: async (getToken) => {
      if (!warehouseId) return {}
      try {
        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/stock-balances?warehouseId=${encodeURIComponent(warehouseId)}`
        )) as { items?: Array<{ product_variant_id: string; qty_on_hand: number | string }> }
        if (payload?.items && Array.isArray(payload.items)) {
          const map: Record<string, number> = {}
          for (const row of payload.items) {
            map[row.product_variant_id] = Number(row.qty_on_hand)
          }
          return map
        }
      } catch (err) {
        console.warn('API /api/inventory/stock-balances fallback to Supabase:', err)
      }
      const { data, error } = await supabase
        .from('stock_balances')
        .select('product_variant_id, qty_on_hand')
        .eq('warehouse_id', warehouseId as string)
      if (error) throw error
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        map[(row as { product_variant_id: string }).product_variant_id] =
          Number((row as { qty_on_hand: number | string }).qty_on_hand)
      }
      return map
    },
  })
}

/** Product variants searchable by SKU or product name (for line-item pickers). */
export function useVariantOptions(search?: string) {
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<VariantOption[]>({
    queryKey: ['product-variants', 'options', search ?? ''],
    queryFn: async () => {
      let query = supabase
        .from('product_variants')
        .select('id, sku, barcode, products(id, name), price_list_items(price, cost_price)')
        .order('sku')
        .limit(50)
      if (search) {
        query = query.ilike('sku', `%${search}%`)
      }
      const { data, error } = await query
      if (error) throw error
      type VariantLookupRow = {
        id: string
        sku: string
        barcode: string | null
        products: { id?: string; name: string } | null
        price_list_items?: Array<{ price?: number | string | null; cost_price?: number | string | null }> | null
      }
      return ((data ?? []) as unknown as VariantLookupRow[]).map((row) => {
        const pli = row.price_list_items?.[0]
        return {
          id: row.id,
          sku: row.sku,
          barcode: row.barcode,
          price: Number(pli?.price ?? 0),
          cost_price: pli?.cost_price != null ? Number(pli.cost_price) : null,
          products: row.products,
        }
      })
    },
    enabled: authEnabled,
  })
}

export interface CurrencyOption {
  id: string
  code: string
  name: string
  symbol: string
  is_active?: boolean | null
}

const DEFAULT_FALLBACK_CURRENCIES: CurrencyOption[] = [
  { id: 'usd', code: 'USD', name: 'US Dollar', symbol: '$', is_active: true },
  { id: 'eur', code: 'EUR', name: 'Euro', symbol: '€', is_active: true },
  { id: 'gbp', code: 'GBP', name: 'British Pound', symbol: '£', is_active: true },
  { id: 'sar', code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', is_active: true },
  { id: 'aed', code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', is_active: true },
  { id: 'egp', code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', is_active: true },
  { id: 'qar', code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', is_active: true },
  { id: 'kwd', code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', is_active: true },
]

/** All active currencies from the real currencies table for transaction forms */
export function useCurrencyOptions() {
  const { authEnabled } = useAuthEnabled()
  return useQuery<CurrencyOption[]>({
    queryKey: ['currencies', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('id, code, name, symbol, is_active')
        .neq('is_active', false)
        .order('code')

      if (error) {
        return DEFAULT_FALLBACK_CURRENCIES
      }
      if (!data || data.length === 0) {
        return DEFAULT_FALLBACK_CURRENCIES
      }
      return data as CurrencyOption[]
    },
    enabled: authEnabled,
  })
}

export interface BranchOption {
  id: string
  name: string
}

/** All active branches for selection in transfers and adjustments */
export function useBranchOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<BranchOption[]>({
    queryKey: ['branches', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as BranchOption[]
    },
    enabled: authEnabled,
  })
}


