import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import {
  type Inventory,
  type InventoryFormValues,
  type InventoryWarehouseRelation,
  type InventoryLocationRelation,
  type InventoryStoreRelation,
  type InventoryVariantRelation,
  type InventoryProductRelation,
} from '../data/schema'

export interface InventoryInput {
  product_id: string
  product_variant_id?: string | null
  store_id?: string | null
  warehouse_id?: string | null
  warehouse_location_id?: string | null
  reorder_point?: number | null
  min_quantity?: number | null
  max_quantity?: number | null
  last_count_date?: string | null
  tenant_id?: string | null
  // Compatibility aliases
  reorder_level?: number | null
  max_stock_level?: number | null
  quantity?: number
}

function getAuthTenantAndUser() {
  const { user, profile } = useAuthStore.getState().auth
  const tenantId =
    profile?.tenant_id ||
    (user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id ||
    null

  const userId = profile?.id || profile?.auth_user_id || user?.id || null

  return {
    tenantId: tenantId ? String(tenantId) : null,
    userId: userId ? String(userId) : null,
  }
}

export const useInventory = () => {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()

      // 1. Fetch inventory records with relationships
      let query = supabase.from('inventory').select(`
          inventory_id,
          product_id,
          product_variant_id,
          store_id,
          warehouse_id,
          warehouse_location_id,
          reorder_point,
          min_quantity,
          max_quantity,
          last_count_date,
          tenant_id,
          created_at,
          updated_at,
          created_by_user_id,
          updated_by_user_id,
          products (
            id,
            name,
            sku,
            has_variants
          ),
          product_variants (
            id,
            product_id,
            name,
            sku
          ),
          stores (
            store_id,
            name
          ),
          warehouses (
            id,
            name,
            code,
            is_default,
            is_active
          ),
          warehouse_locations (
            id,
            name,
            code,
            location_type,
            path,
            is_pickable,
            is_receivable
          )
        `)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data: inventoryData, error: inventoryError } = await query.order(
        'inventory_id',
        {
          ascending: false,
        }
      )

      if (inventoryError) throw inventoryError

      // 2. Fetch stock_balances to aggregate real-time quantities
      let sbQuery = supabase.from('stock_balances').select(`
          id,
          product_variant_id,
          warehouse_id,
          location_id,
          store_id,
          qty_on_hand,
          qty_reserved,
          qty_available,
          avg_cost,
          condition,
          last_movement_at
        `)

      if (tenantId) {
        sbQuery = sbQuery.eq('tenant_id', tenantId)
      }

      const { data: stockBalances } = await sbQuery

      interface RawStockBalanceItem {
        id: string
        product_variant_id?: string | null
        warehouse_id?: string | null
        location_id?: string | null
        store_id?: string | null
        qty_on_hand?: number | string | null
        qty_reserved?: number | string | null
        qty_available?: number | string | null
        avg_cost?: number | string | null
        condition?: string | null
        last_movement_at?: string | null
      }

      const balances =
        (stockBalances as unknown as RawStockBalanceItem[] | null) || []

      // 3. Merge aggregated stock balance quantities into each inventory item
      return (inventoryData || []).map((rawItem: unknown) => {
        const item = rawItem as Inventory
        // Find matching stock balances for this item
        const matchingBalances = balances.filter((sb) => {
          if (item.product_variant_id) {
            if (sb.product_variant_id !== item.product_variant_id) return false
          }
          if (item.warehouse_id && sb.warehouse_id) {
            if (sb.warehouse_id !== item.warehouse_id) return false
          }
          if (item.warehouse_location_id && sb.location_id) {
            if (sb.location_id !== item.warehouse_location_id) return false
          }
          if (item.store_id && sb.store_id) {
            if (sb.store_id !== item.store_id) return false
          }
          return true
        })

        const qty_on_hand = matchingBalances.reduce(
          (sum, b) => sum + Number(b.qty_on_hand || 0),
          0
        )
        const qty_reserved = matchingBalances.reduce(
          (sum, b) => sum + Number(b.qty_reserved || 0),
          0
        )
        const qty_available = matchingBalances.reduce(
          (sum, b) => sum + Number(b.qty_available || 0),
          0
        )

        // Calculate weighted average cost or default to first available
        const totalValue = matchingBalances.reduce(
          (sum, b) =>
            sum + Number(b.qty_on_hand || 0) * Number(b.avg_cost || 0),
          0
        )
        const avg_cost =
          qty_on_hand > 0
            ? totalValue / qty_on_hand
            : Number(matchingBalances[0]?.avg_cost ?? 0)

        const condition = matchingBalances[0]?.condition ?? 'good'

        return {
          ...item,
          qty_on_hand,
          qty_reserved,
          qty_available,
          avg_cost: Number(avg_cost) || 0,
          condition,
          // Compatibility fields
          quantity: qty_on_hand,
          reorder_level: item.reorder_point ?? item.min_quantity ?? 0,
          max_stock_level: item.max_quantity ?? null,
          last_restocked:
            item.last_count_date ?? item.updated_at ?? item.created_at,
          location:
            item.warehouse_locations?.code || item.warehouses?.code || null,
        } as Inventory
      })
    },
  })
}

export const useCreateInventory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InventoryInput | InventoryFormValues) => {
      const { tenantId, userId } = getAuthTenantAndUser()

      const payload = {
        product_id: input.product_id,
        product_variant_id: input.product_variant_id || null,
        store_id: input.store_id || null,
        warehouse_id: input.warehouse_id || null,
        warehouse_location_id: input.warehouse_location_id || null,
        reorder_point: input.reorder_point ?? input.reorder_level ?? 0,
        min_quantity: input.min_quantity ?? input.reorder_level ?? 0,
        max_quantity: input.max_quantity ?? input.max_stock_level ?? null,
        last_count_date: input.last_count_date || new Date().toISOString(),
        tenant_id: input.tenant_id || tenantId,
        created_by_user_id: userId,
        updated_by_user_id: userId,
      }

      const { data, error } = await supabase
        .from('inventory')
        .insert(payload)
        .select(
          `
          inventory_id,
          product_id,
          product_variant_id,
          store_id,
          warehouse_id,
          warehouse_location_id,
          reorder_point,
          min_quantity,
          max_quantity,
          last_count_date,
          tenant_id,
          products (id, name, sku, has_variants),
          product_variants (id, product_id, name, sku),
          stores (store_id, name),
          warehouses (id, name, code),
          warehouse_locations (id, name, code, location_type, path)
        `
        )
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export const useUpdateInventory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      inventory_id,
      ...updates
    }: (InventoryInput | InventoryFormValues) & { inventory_id: number }) => {
      const { userId } = getAuthTenantAndUser()

      const payload: Record<string, unknown> = {
        product_id: updates.product_id,
        product_variant_id: updates.product_variant_id || null,
        reorder_point: updates.reorder_point ?? updates.reorder_level ?? 0,
        min_quantity: updates.min_quantity ?? updates.reorder_level ?? 0,
        max_quantity: updates.max_quantity ?? updates.max_stock_level ?? null,
        updated_by_user_id: userId,
        updated_at: new Date().toISOString(),
      }

      if (updates.store_id !== undefined) {
        payload.store_id = updates.store_id || null
      }
      if (updates.warehouse_id !== undefined) {
        payload.warehouse_id = updates.warehouse_id || null
      }
      if (updates.warehouse_location_id !== undefined) {
        payload.warehouse_location_id = updates.warehouse_location_id || null
      }
      if (updates.last_count_date) {
        payload.last_count_date = updates.last_count_date
      }

      const { data, error } = await supabase
        .from('inventory')
        .update(payload)
        .eq('inventory_id', inventory_id)
        .select(
          `
          inventory_id,
          product_id,
          product_variant_id,
          store_id,
          warehouse_id,
          warehouse_location_id,
          reorder_point,
          min_quantity,
          max_quantity,
          last_count_date,
          tenant_id,
          products (id, name, sku, has_variants),
          product_variants (id, product_id, name, sku),
          stores (store_id, name),
          warehouses (id, name, code),
          warehouse_locations (id, name, code, location_type, path)
        `
        )
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export const useDeleteInventory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inventory_id: number) => {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('inventory_id', inventory_id)

      if (error) throw error
      return inventory_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export const useInventoryProducts = () => {
  return useQuery({
    queryKey: ['inventory-products-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, has_variants')
        .neq('is_deleted', true)
        .order('name')

      if (error) throw error
      return (data || []) as InventoryProductRelation[]
    },
  })
}

export const useProductVariants = (productId?: string | null) => {
  return useQuery({
    queryKey: ['product-variants-for-product', productId],
    queryFn: async () => {
      if (!productId) return []
      const { data, error } = await supabase
        .from('product_variants')
        .select(
          'id, product_id, sku, name, barcode, dimensions, weight, is_active, price'
        )
        .eq('product_id', productId)
        .order('sku')

      if (error) throw error

      return ((data || []) as unknown as Array<Record<string, unknown>>).map(
        (v) => {
          let dimLabel = ''
          if (typeof v.dimensions === 'string') {
            try {
              const parsed = JSON.parse(v.dimensions)
              dimLabel = parsed?.label || v.dimensions
            } catch {
              dimLabel = v.dimensions
            }
          } else if (
            v.dimensions &&
            typeof v.dimensions === 'object' &&
            'label' in (v.dimensions as Record<string, unknown>)
          ) {
            dimLabel = String(
              (v.dimensions as Record<string, unknown>).label || ''
            )
          }

          return {
            id: String(v.id),
            product_id: v.product_id ? String(v.product_id) : undefined,
            sku: String(v.sku || ''),
            name: v.name ? String(v.name) : null,
            barcode: v.barcode ? String(v.barcode) : null,
            dimensions: v.dimensions,
            weight: v.weight ? Number(v.weight) : null,
            is_active: v.is_active !== false,
            price: v.price != null ? Number(v.price) : null,
            attributes_label: dimLabel || (v.name ? String(v.name) : ''),
          } as InventoryVariantRelation
        }
      )
    },
    enabled: !!productId,
  })
}

export const useWarehouses = () => {
  return useQuery({
    queryKey: ['inventory-warehouses-list'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('warehouses')
        .select('id, name, code, is_default, is_active')
        .eq('is_active', true)
        .order('name')

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as InventoryWarehouseRelation[]
    },
  })
}

export const useWarehouseLocations = (warehouseId?: string | null) => {
  return useQuery({
    queryKey: ['inventory-warehouse-locations', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return []
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('warehouse_locations')
        .select(
          'id, code, name, location_type, path, is_pickable, is_receivable, is_default'
        )
        .eq('warehouse_id', warehouseId)
        .eq('is_active', true)
        .order('code')

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as InventoryLocationRelation[]
    },
    enabled: !!warehouseId,
  })
}

export const useStores = () => {
  return useQuery({
    queryKey: ['inventory-stores-list'],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase.from('stores').select('store_id, name').order('name')

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as InventoryStoreRelation[]
    },
  })
}

export const useStoreWarehouses = (storeId?: string | null) => {
  return useQuery({
    queryKey: ['inventory-store-warehouses', storeId],
    queryFn: async () => {
      if (!storeId) return []
      const { data, error } = await supabase
        .from('store_warehouses')
        .select(
          `
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
            is_default
          )
        `
        )
        .eq('store_id', storeId)
        .order('priority', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!storeId,
  })
}

export const useStockBalancesForProduct = (
  variantId?: string | null,
  warehouseId?: string | null
) => {
  return useQuery({
    queryKey: ['stock-balances-details', variantId, warehouseId],
    queryFn: async () => {
      if (!variantId) return []
      let query = supabase
        .from('stock_balances')
        .select(
          `
          id,
          product_variant_id,
          warehouse_id,
          location_id,
          store_id,
          qty_on_hand,
          qty_reserved,
          qty_available,
          avg_cost,
          condition,
          last_movement_at,
          warehouses (id, name, code),
          warehouse_locations (id, name, code, location_type, path)
        `
        )
        .eq('product_variant_id', variantId)

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!variantId,
  })
}
