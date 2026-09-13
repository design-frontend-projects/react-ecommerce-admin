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
  safety_stock?: number | null
  reorder_quantity?: number | null
  unit_cost?: number | null
  lead_time_days?: number | null
  is_active?: boolean
  status?: string | null
  aisle?: string | null
  rack?: string | null
  shelf?: string | null
  bin?: string | null
  last_count_date?: string | null
  last_restocked_date?: string | null
  notes?: string | null
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
          safety_stock,
          reorder_quantity,
          reorder_level,
          unit_cost,
          lead_time_days,
          is_active,
          status,
          aisle,
          rack,
          shelf,
          bin,
          last_count_date,
          last_restocked_date,
          notes,
          tenant_id,
          created_at,
          updated_at,
          created_by_user_id,
          updated_by_user_id,
          products (
            id,
            name,
            sku,
            has_variants,
            barcode,
            categories ( name ),
            brands ( name )
          ),
          product_variants (
            id,
            product_id,
            name,
            sku,
            barcode,
            price_list_items ( price, cost_price )
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
            is_active,
            phone,
            email,
            address,
            allow_negative_stock
          ),
          warehouse_locations (
            id,
            name,
            code,
            location_type,
            path,
            is_pickable,
            is_receivable,
            is_default
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
        safety_stock: input.safety_stock ?? 0,
        reorder_quantity: input.reorder_quantity ?? 0,
        reorder_level: input.reorder_level ?? input.reorder_point ?? 0,
        unit_cost: input.unit_cost ?? null,
        lead_time_days: input.lead_time_days ?? 1,
        is_active: input.is_active !== false,
        status: input.status || 'active',
        aisle: input.aisle || null,
        rack: input.rack || null,
        shelf: input.shelf || null,
        bin: input.bin || null,
        last_count_date: input.last_count_date || new Date().toISOString(),
        last_restocked_date: input.last_restocked_date || null,
        notes: input.notes || null,
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
          safety_stock,
          reorder_quantity,
          reorder_level,
          unit_cost,
          lead_time_days,
          is_active,
          status,
          aisle,
          rack,
          shelf,
          bin,
          last_count_date,
          last_restocked_date,
          notes,
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
        safety_stock: updates.safety_stock ?? 0,
        reorder_quantity: updates.reorder_quantity ?? 0,
        reorder_level: updates.reorder_level ?? updates.reorder_point ?? 0,
        unit_cost: updates.unit_cost ?? null,
        lead_time_days: updates.lead_time_days ?? 1,
        is_active: updates.is_active !== false,
        status: updates.status || 'active',
        aisle: updates.aisle || null,
        rack: updates.rack || null,
        shelf: updates.shelf || null,
        bin: updates.bin || null,
        notes: updates.notes || null,
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
      if (updates.last_restocked_date !== undefined) {
        payload.last_restocked_date = updates.last_restocked_date || null
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
          safety_stock,
          reorder_quantity,
          reorder_level,
          unit_cost,
          lead_time_days,
          is_active,
          status,
          aisle,
          rack,
          shelf,
          bin,
          last_count_date,
          last_restocked_date,
          notes,
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
        .select(`
          id,
          name,
          sku,
          has_variants,
          barcode,
          categories ( name ),
          brands ( name )
        `)
        .neq('is_deleted', true)
        .order('name')

      if (error) throw error
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        has_variants: p.has_variants,
        barcode: p.barcode,
        category: p.categories?.name ?? null,
        brand: p.brands?.name ?? null,
      })) as InventoryProductRelation[]
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
        .select(`
          id,
          product_id,
          sku,
          name,
          barcode,
          dimensions,
          weight,
          is_active,
          price_list_items ( price, cost_price ),
          stock_balances ( qty_on_hand, qty_available, qty_reserved )
        `)
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

          const pliList = Array.isArray(v.price_list_items) ? (v.price_list_items as any[]) : []
          const price = pliList[0]?.price != null ? Number(pliList[0].price) : null
          const cost_price = pliList[0]?.cost_price != null ? Number(pliList[0].cost_price) : null

          const stockList = Array.isArray(v.stock_balances) ? (v.stock_balances as any[]) : []
          const qty_on_hand = stockList.reduce((sum, s) => sum + Number(s.qty_on_hand || 0), 0)
          const qty_available = stockList.reduce((sum, s) => sum + Number(s.qty_available || 0), 0)
          const qty_reserved = stockList.reduce((sum, s) => sum + Number(s.qty_reserved || 0), 0)

          return {
            id: String(v.id),
            product_id: v.product_id ? String(v.product_id) : undefined,
            sku: String(v.sku || ''),
            name: v.name ? String(v.name) : null,
            barcode: v.barcode ? String(v.barcode) : null,
            dimensions: v.dimensions,
            weight: v.weight ? Number(v.weight) : null,
            is_active: v.is_active !== false,
            price,
            cost_price,
            qty_on_hand,
            qty_available,
            qty_reserved,
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
        .select('id, name, code, is_default, is_active, phone, email, address, allow_negative_stock')
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
      if (!storeId || storeId === 'none') return []

      // 1. Primary: Server API query returning all related warehouses with tenant isolation
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
          const res = await fetch(
            `/api/inventory/store-warehouses?storeId=${encodeURIComponent(storeId)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
          if (res.ok) {
            const json = await res.json()
            if (json.success && Array.isArray(json.data)) {
              return json.data
            }
          }
        }
      } catch (err) {
        console.warn(
          'Failed to fetch store-warehouses via server API, falling back to Supabase:',
          err
        )
      }

      // 2. Direct Supabase Fallback
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
          allow_replenishment,
          allow_returns,
          lead_time_days,
          distance_km,
          transit_cost,
          is_active,
          notes,
          warehouses (
            id,
            name,
            code,
            is_active,
            is_default,
            allow_negative_stock,
            phone,
            email,
            address,
            warehouse_locations (
              id,
              code,
              name,
              location_type,
              path,
              is_pickable,
              is_receivable,
              is_default
            )
          )
        `
        )
        .eq('store_id', storeId)
        .order('priority', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: Boolean(storeId && storeId !== 'none'),
  })
}

export interface VariantStockBalanceResult {
  items: Array<{
    id: string
    warehouse_id?: string | null
    store_id?: string | null
    location_id?: string | null
    qty_on_hand: number
    qty_reserved: number
    qty_available: number
    avg_cost: number
    condition?: string
    warehouses?: { id: string; name: string; code: string } | null
    stores?: { store_id: string; name: string } | null
    warehouse_locations?: { id: string; name: string; code: string } | null
  }>
  metrics: {
    totalOnHand: number
    totalReserved: number
    totalAvailable: number
  }
  inSelectedLocation: {
    onHand: number
    available: number
    reserved: number
  }
  warehouseStock: {
    onHand: number
    available: number
    reserved: number
  }
  storeStock: {
    onHand: number
    available: number
    reserved: number
  }
  stockByWarehouse: Record<
    string,
    { onHand: number; available: number; reserved: number; code?: string; name?: string }
  >
}

export const useStockBalancesForProduct = (
  variantId?: string | null,
  warehouseId?: string | null,
  storeId?: string | null
) => {
  return useQuery<VariantStockBalanceResult>({
    queryKey: ['stock-balances-details', variantId, warehouseId ?? 'all', storeId ?? 'all'],
    queryFn: async () => {
      const emptyResult: VariantStockBalanceResult = {
        items: [],
        metrics: { totalOnHand: 0, totalReserved: 0, totalAvailable: 0 },
        inSelectedLocation: { onHand: 0, available: 0, reserved: 0 },
        warehouseStock: { onHand: 0, available: 0, reserved: 0 },
        storeStock: { onHand: 0, available: 0, reserved: 0 },
        stockByWarehouse: {},
      }

      if (!variantId || variantId === 'none') {
        return emptyResult
      }

      const params = new URLSearchParams()
      params.set('productVariantId', variantId)
      params.set('limit', '500')

      // 1. Try server API
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
          const res = await fetch(`/api/inventory/stock-balances?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const json = await res.json()
            if (json.success && Array.isArray(json.items)) {
              const items = json.items.map((r: any) => {
                const onHand = Number(r.qty_on_hand || 0)
                const reserved = Number(r.qty_reserved || 0)
                const available =
                  r.qty_available !== null && r.qty_available !== undefined
                    ? Number(r.qty_available)
                    : Math.max(0, onHand - reserved)
                return {
                  id: r.id,
                  warehouse_id: r.warehouse_id ?? null,
                  store_id: r.store_id ?? null,
                  location_id: r.location_id ?? null,
                  qty_on_hand: onHand,
                  qty_reserved: reserved,
                  qty_available: available,
                  avg_cost: Number(r.avg_cost || 0),
                  condition: r.condition || 'good',
                  warehouses: r.warehouses ?? null,
                  stores: r.stores ?? null,
                  warehouse_locations: r.warehouse_locations ?? null,
                }
              })

              const hasWh = Boolean(warehouseId && warehouseId !== 'none')
              const hasStore = Boolean(storeId && storeId !== 'none')

              let whOnHand = 0
              let whReserved = 0
              let whAvailable = 0

              let storeOnHand = 0
              let storeReserved = 0
              let storeAvailable = 0

              const stockByWarehouse: Record<
                string,
                { onHand: number; available: number; reserved: number; code?: string; name?: string }
              > = {}

              items.forEach((item: any) => {
                if (item.warehouse_id) {
                  const existing = stockByWarehouse[item.warehouse_id] || {
                    onHand: 0,
                    available: 0,
                    reserved: 0,
                    code: item.warehouses?.code,
                    name: item.warehouses?.name,
                  }
                  existing.onHand += item.qty_on_hand
                  existing.reserved += item.qty_reserved
                  existing.available += item.qty_available
                  stockByWarehouse[item.warehouse_id] = existing
                }

                if (hasWh && item.warehouse_id === warehouseId) {
                  whOnHand += item.qty_on_hand
                  whReserved += item.qty_reserved
                  whAvailable += item.qty_available
                }

                if (hasStore && item.store_id === storeId) {
                  storeOnHand += item.qty_on_hand
                  storeReserved += item.qty_reserved
                  storeAvailable += item.qty_available
                }
              })

              const locOnHand = hasWh
                ? whOnHand
                : hasStore
                ? storeOnHand
                : (json.metrics?.totalOnHand ?? 0)
              const locAvailable = hasWh
                ? whAvailable
                : hasStore
                ? storeAvailable
                : (json.metrics?.totalAvailable ?? 0)
              const locReserved = hasWh
                ? whReserved
                : hasStore
                ? storeReserved
                : (json.metrics?.totalReserved ?? 0)

              return {
                items,
                metrics: {
                  totalOnHand: json.metrics?.totalOnHand ?? items.reduce((s: number, i: any) => s + i.qty_on_hand, 0),
                  totalReserved: json.metrics?.totalReserved ?? items.reduce((s: number, i: any) => s + i.qty_reserved, 0),
                  totalAvailable: json.metrics?.totalAvailable ?? items.reduce((s: number, i: any) => s + i.qty_available, 0),
                },
                inSelectedLocation: {
                  onHand: locOnHand,
                  available: locAvailable,
                  reserved: locReserved,
                },
                warehouseStock: {
                  onHand: whOnHand,
                  available: whAvailable,
                  reserved: whReserved,
                },
                storeStock: {
                  onHand: storeOnHand,
                  available: storeAvailable,
                  reserved: storeReserved,
                },
                stockByWarehouse,
              }
            }
          }
        }
      } catch (err) {
        console.warn(
          'Failed to fetch stock balances via API, falling back to Supabase:',
          err
        )
      }

      // 2. Direct Supabase Fallback
      const { data, error } = await supabase
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

      if (error) throw error

      const rawItems = (data || []).map((r: any) => {
        const onHand = Number(r.qty_on_hand || 0)
        const reserved = Number(r.qty_reserved || 0)
        const available =
          r.qty_available !== null && r.qty_available !== undefined
            ? Number(r.qty_available)
            : Math.max(0, onHand - reserved)
        return {
          id: r.id,
          warehouse_id: r.warehouse_id ?? null,
          store_id: r.store_id ?? null,
          location_id: r.location_id ?? null,
          qty_on_hand: onHand,
          qty_reserved: reserved,
          qty_available: available,
          avg_cost: Number(r.avg_cost || 0),
          condition: r.condition || 'good',
          warehouses: Array.isArray(r.warehouses) ? r.warehouses[0] : r.warehouses,
          stores: null,
          warehouse_locations: Array.isArray(r.warehouse_locations)
            ? r.warehouse_locations[0]
            : r.warehouse_locations,
        }
      })

      const hasWh = Boolean(warehouseId && warehouseId !== 'none')
      const hasStore = Boolean(storeId && storeId !== 'none')

      let whOnHand = 0
      let whReserved = 0
      let whAvailable = 0

      let storeOnHand = 0
      let storeReserved = 0
      let storeAvailable = 0

      const stockByWarehouse: Record<
        string,
        { onHand: number; available: number; reserved: number; code?: string; name?: string }
      > = {}

      rawItems.forEach((item: any) => {
        if (item.warehouse_id) {
          const existing = stockByWarehouse[item.warehouse_id] || {
            onHand: 0,
            available: 0,
            reserved: 0,
            code: item.warehouses?.code,
            name: item.warehouses?.name,
          }
          existing.onHand += item.qty_on_hand
          existing.reserved += item.qty_reserved
          existing.available += item.qty_available
          stockByWarehouse[item.warehouse_id] = existing
        }

        if (hasWh && item.warehouse_id === warehouseId) {
          whOnHand += item.qty_on_hand
          whReserved += item.qty_reserved
          whAvailable += item.qty_available
        }

        if (hasStore && item.store_id === storeId) {
          storeOnHand += item.qty_on_hand
          storeReserved += item.qty_reserved
          storeAvailable += item.qty_available
        }
      })

      const totalOnHand = rawItems.reduce((s: number, i: any) => s + i.qty_on_hand, 0)
      const totalReserved = rawItems.reduce((s: number, i: any) => s + i.qty_reserved, 0)
      const totalAvailable = rawItems.reduce((s: number, i: any) => s + i.qty_available, 0)

      const locOnHand = hasWh ? whOnHand : hasStore ? storeOnHand : totalOnHand
      const locAvailable = hasWh ? whAvailable : hasStore ? storeAvailable : totalAvailable
      const locReserved = hasWh ? whReserved : hasStore ? storeReserved : totalReserved

      return {
        items: rawItems,
        metrics: { totalOnHand, totalReserved, totalAvailable },
        inSelectedLocation: {
          onHand: locOnHand,
          available: locAvailable,
          reserved: locReserved,
        },
        warehouseStock: {
          onHand: whOnHand,
          available: whAvailable,
          reserved: whReserved,
        },
        storeStock: {
          onHand: storeOnHand,
          available: storeAvailable,
          reserved: storeReserved,
        },
        stockByWarehouse,
      }
    },
    enabled: Boolean(variantId && variantId !== 'none'),
  })
}
