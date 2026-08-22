import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'

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
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<WarehouseOption[]>({
    queryKey: ['warehouses', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as WarehouseOption[]
    },
    enabled: authEnabled,
  })
}

/** Locations inside a specific warehouse */
export function useWarehouseLocationOptions(warehouseId?: string) {
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<WarehouseLocationOption[]>({
    queryKey: ['warehouse-locations', 'options', warehouseId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('warehouse_locations')
        .select('id, warehouse_id, code, name, location_type')
        .eq('is_active', true)
        .order('code')
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId)
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as WarehouseLocationOption[]
    },
    enabled: authEnabled,
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
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<Record<string, number>>({
    queryKey: ['stock-balances', 'on-hand', storeId ?? ''],
    enabled: Boolean(storeId) && authEnabled,
    queryFn: async () => {
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
  const { authEnabled } = useAuthEnabled({ permission: 'inventory.stock.view' })
  return useQuery<Record<string, number>>({
    queryKey: ['stock-balances', 'on-hand-warehouse', warehouseId ?? ''],
    enabled: Boolean(warehouseId) && authEnabled,
    queryFn: async () => {
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
        .select('id, sku, barcode, price, cost_price, products(id, name)')
        .order('sku')
        .limit(50)
      if (search) {
        query = query.ilike('sku', `%${search}%`)
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as VariantOption[]
    },
    enabled: authEnabled,
  })
}

