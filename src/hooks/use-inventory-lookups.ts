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
  is_default?: boolean
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
  group_id?: string | null
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
        // eslint-disable-next-line no-console
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

export interface StoreWarehouseOption {
  id: string
  name: string
  code: string
  is_default: boolean
  priority: number
  allow_fulfillment: boolean
  allow_negative_stock?: boolean
  is_active?: boolean
  notes?: string | null
}

/** Warehouses linked to a specific store via store_warehouses table, branch, or stock balances */
export function useStoreWarehouses(storeId?: string | null) {
  return useAuthQuery<StoreWarehouseOption[]>({
    queryKey: ['store-warehouses', 'options', storeId ?? 'none'],
    enabled: Boolean(storeId),
    queryFn: async (getToken) => {
      if (!storeId) return []

      // 1. Primary: Server API query returning all related warehouses
      try {
        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/store-warehouses?storeId=${encodeURIComponent(storeId)}`
        )) as {
          success?: boolean
          data?: Array<{
            id: string
            warehouse_id: string
            is_default?: boolean
            priority?: number
            allow_fulfillment?: boolean
            is_active?: boolean
            notes?: string | null
            warehouses?:
              | {
                  id: string
                  name: string
                  code: string
                  is_active?: boolean
                  allow_negative_stock?: boolean
                }
              | Array<{
                  id: string
                  name: string
                  code: string
                  is_active?: boolean
                  allow_negative_stock?: boolean
                }>
              | null
          }>
        }

        if (payload?.success && Array.isArray(payload.data)) {
          const results: StoreWarehouseOption[] = []
          const seenWhIds = new Set<string>()

          for (const item of payload.data) {
            const rawWh = item.warehouses
            const wh = Array.isArray(rawWh) ? rawWh[0] : rawWh
            const whId = wh?.id || item.warehouse_id
            if (whId && !seenWhIds.has(whId) && wh?.is_active !== false) {
              seenWhIds.add(whId)
              results.push({
                id: whId,
                name: wh?.name || 'Warehouse',
                code: wh?.code || '',
                is_default: Boolean(item.is_default),
                priority: Number(item.priority ?? 1),
                allow_fulfillment: item.allow_fulfillment !== false,
                allow_negative_stock: Boolean(wh?.allow_negative_stock),
                is_active: wh?.is_active ?? item.is_active ?? true,
                notes: item.notes || null,
              })
            }
          }

          if (results.length > 0) {
            return results
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('API /api/inventory/store-warehouses fallback to Supabase:', err)
      }

      // 2. Supabase Fallback: query store_warehouses with active filters
      const { data, error } = await supabase
        .from('store_warehouses')
        .select(`
          id,
          store_id,
          warehouse_id,
          is_default,
          priority,
          allow_fulfillment,
          is_active,
          warehouses (
            id,
            name,
            code,
            is_active,
            allow_negative_stock
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('Supabase store_warehouses query failed:', error)
      }

      const results: StoreWarehouseOption[] = []
      const seenWhIds = new Set<string>()

      interface RawStoreWarehouseRow {
        id: string
        store_id: string
        warehouse_id: string
        is_default?: boolean
        priority?: number
        allow_fulfillment?: boolean
        is_active?: boolean
        warehouses?:
          | {
              id: string
              name: string
              code: string
              is_active?: boolean
              allow_negative_stock?: boolean
            }
          | Array<{
              id: string
              name: string
              code: string
              is_active?: boolean
              allow_negative_stock?: boolean
            }>
          | null
      }

      for (const row of (data ?? []) as unknown as RawStoreWarehouseRow[]) {
        const rawWh = row.warehouses
        const wh = Array.isArray(rawWh) ? rawWh[0] : rawWh
        if (wh && wh.is_active !== false) {
          const whId = wh.id || row.warehouse_id
          if (whId && !seenWhIds.has(whId)) {
            seenWhIds.add(whId)
            results.push({
              id: whId,
              name: wh.name,
              code: wh.code,
              is_default: Boolean(row.is_default),
              priority: Number(row.priority ?? 1),
              allow_fulfillment: row.allow_fulfillment !== false,
              allow_negative_stock: Boolean(wh.allow_negative_stock),
              is_active: wh.is_active ?? row.is_active ?? true,
            })
          }
        }
      }

      // Branch fallback if direct links returned nothing
      if (results.length === 0) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('branch_id')
          .eq('store_id', storeId)
          .maybeSingle()

        if (storeData?.branch_id) {
          const { data: branchWhs } = await supabase
            .from('warehouses')
            .select('id, name, code, is_active, allow_negative_stock')
            .eq('branch_id', storeData.branch_id)

          for (const bw of (branchWhs ?? []) as Array<{
            id: string
            name: string
            code: string
            is_active?: boolean
            allow_negative_stock?: boolean
          }>) {
            if (!seenWhIds.has(bw.id)) {
              seenWhIds.add(bw.id)
              results.push({
                id: bw.id,
                name: bw.name,
                code: bw.code,
                is_default: results.length === 0,
                priority: results.length + 1,
                allow_fulfillment: true,
                allow_negative_stock: Boolean(bw.allow_negative_stock),
                is_active: bw.is_active ?? true,
              })
            }
          }
        }
      }

      return results
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
        // eslint-disable-next-line no-console
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
        .select('id, first_name, last_name, phone, code, group_id')
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
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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

export interface ChannelOption {
  id: string
  code: string
  name: string
  name_ar?: string | null
  is_active?: boolean
}

/** All active sales channels for selection in sales orders */
export function useChannelOptions() {
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<ChannelOption[]>({
    queryKey: ['channels', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id, code, name, name_ar, is_active')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as ChannelOption[]
    },
    enabled: authEnabled,
  })
}



