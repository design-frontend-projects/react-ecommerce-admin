import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { supabase } from '@/lib/supabase'
import { fetchInventoryItems } from '../data/actions'
import {
  type Inventory,
  type InventoryFormValues,
  type InventoryWarehouseRelation,
  type InventoryLocationRelation,
  type InventoryStoreRelation,
  type InventoryVariantRelation,
  type InventoryProductRelation,
  type InventoryUomRelation,
  type ProductVariantItem,
  type PaginatedProductVariantsResult,
  type InventoryFilters,
  type InventoryPaginatedResponse,
} from '../data/schema'


export interface InventoryInput {
  id?: string
  inventory_id?: string | number
  product_id?: string | null
  product_variant_id?: string | null
  sku?: string
  barcode?: string | null
  is_stockable?: boolean
  is_sellable?: boolean
  is_purchasable?: boolean
  tracking_type?: 'NONE' | 'LOT' | 'SERIAL' | 'LOT_AND_SERIAL' | string
  unit_of_measure_id?: string | null
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

export const inventoryQueryKey = ['inventory'] as const

/**
 * Hook to fetch inventory items with server-side pagination, search, sorting, filtering,
 * and global KPI metrics calculation.
 */
export function useInventoryPaginated(filters: InventoryFilters = {}) {
  const query = useAuthQuery<InventoryPaginatedResponse>({
    queryKey: [...inventoryQueryKey, 'paginated', filters],
    queryFn: (getToken) => fetchInventoryItems(getToken, filters),
    rbac: { permission: 'inventory.view' },
    staleTime: 30_000,
  })

  const pageSize = query.data?.pageSize ?? filters.pageSize ?? 20
  const totalCount = query.data?.totalCount ?? 0
  const page = query.data?.page ?? filters.page ?? 1
  const totalPages =
    query.data?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))

  return {
    ...query,
    inventory: query.data?.items ?? [],
    metrics: query.data?.metrics,
    totalCount,
    totalPages,
    page,
    pageSize,
  }
}

export const useInventory = (limit: number = 1000) => {

  return useQuery({
    queryKey: ['inventory', limit],
    queryFn: async () => {
      const { tenantId } = getAuthTenantAndUser()

      // 1. Fetch inventory_items records with variant & product relations
      let query = supabase.from('inventory_items').select(`
          id,
          tenant_id,
          product_variant_id,
          sku,
          barcode,
          is_stockable,
          is_sellable,
          is_purchasable,
          tracking_type,
          unit_of_measure_id,
          status,
          is_active,
          notes,
          created_at,
          updated_at,
          created_by_user_id,
          updated_by_user_id,
          product_variants (
            id,
            product_id,
            name,
            sku,
            barcode,
            weight,
            dimensions,
            is_active,
            price_list_items ( price, cost_price ),
            products (
              id,
              name,
              sku,
              has_variants,
              barcode,
              categories ( name ),
              brands ( name )
            )
          ),
          uoms (
            id,
            code,
            name,
            is_base
          )
        `)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data: inventoryData, error: inventoryError } = await query
        .order('created_at', { ascending: false })
        .limit(limit)

      if (inventoryError) {
        console.error('Failed to fetch inventory_items:', inventoryError)
        throw inventoryError
      }

      if (!inventoryData || inventoryData.length === 0) {
        return []
      }

      // 2. Fetch stock_balances and reorder_rules in parallel to aggregate metrics
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
          last_movement_at,
          warehouses ( id, name, code ),
          warehouse_locations ( id, name, code )
        `)

      if (tenantId) {
        sbQuery = sbQuery.eq('tenant_id', tenantId)
      }

      let rrQuery = supabase.from('reorder_rules').select(`
          id,
          product_variant_id,
          warehouse_id,
          store_id,
          min_qty,
          max_qty,
          safety_stock,
          reorder_point,
          reorder_qty,
          lead_time_days,
          warehouses ( id, name, code ),
          stores ( store_id, name )
        `)

      if (tenantId) {
        rrQuery = rrQuery.eq('tenant_id', tenantId)
      }

      const [sbRes, rrRes] = await Promise.all([
        sbQuery.limit(limit * 2),
        rrQuery.limit(limit * 2),
      ])

      if (sbRes.error) {
        console.warn('Could not fetch stock_balances for inventory:', sbRes.error)
      }
      if (rrRes.error) {
        console.warn('Could not fetch reorder_rules for inventory:', rrRes.error)
      }

      const balances = (sbRes.data as any[]) || []
      const rules = (rrRes.data as any[]) || []

      // 4. Merge aggregated stock balance quantities and reorder rules
      return (inventoryData || []).map((rawItem: any) => {
        const matchingBalances = balances.filter(
          (sb) => sb.product_variant_id === rawItem.product_variant_id
        )
        const matchingRule = rules.find(
          (rr) => rr.product_variant_id === rawItem.product_variant_id
        )

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

        const totalValue = matchingBalances.reduce(
          (sum, b) => sum + Number(b.qty_on_hand || 0) * Number(b.avg_cost || 0),
          0
        )
        const avg_cost =
          qty_on_hand > 0
            ? totalValue / qty_on_hand
            : Number(matchingBalances[0]?.avg_cost ?? 0)

        const condition = matchingBalances[0]?.condition ?? 'good'
        const primaryWh = matchingRule?.warehouses || matchingBalances[0]?.warehouses || null
        const primaryLoc = matchingBalances[0]?.warehouse_locations || null
        const primaryStore = matchingRule?.stores || null

        const prod = rawItem.product_variants?.products

        return {
          id: rawItem.id,
          inventory_id: rawItem.id,
          tenant_id: rawItem.tenant_id,
          product_variant_id: rawItem.product_variant_id,
          product_id: rawItem.product_variants?.product_id,
          sku: rawItem.sku,
          barcode: rawItem.barcode,
          is_stockable: rawItem.is_stockable,
          is_sellable: rawItem.is_sellable,
          is_purchasable: rawItem.is_purchasable,
          tracking_type: rawItem.tracking_type,
          unit_of_measure_id: rawItem.unit_of_measure_id,
          status: rawItem.status,
          is_active: rawItem.is_active,
          notes: rawItem.notes,
          created_at: rawItem.created_at,
          updated_at: rawItem.updated_at,
          created_by_user_id: rawItem.created_by_user_id,
          updated_by_user_id: rawItem.updated_by_user_id,

          products: prod
            ? {
                id: prod.id,
                name: prod.name,
                sku: prod.sku,
                has_variants: prod.has_variants,
                barcode: prod.barcode,
                category: prod.categories?.name ?? null,
                brand: prod.brands?.name ?? null,
              }
            : null,

          product_variants: rawItem.product_variants
            ? {
                id: rawItem.product_variants.id,
                product_id: rawItem.product_variants.product_id,
                name: rawItem.product_variants.name,
                sku: rawItem.product_variants.sku,
                barcode: rawItem.product_variants.barcode,
                weight: rawItem.product_variants.weight
                  ? Number(rawItem.product_variants.weight)
                  : null,
                dimensions: rawItem.product_variants.dimensions,
                is_active: rawItem.product_variants.is_active,
                price:
                  Number(
                    rawItem.product_variants.price_list_items?.[0]?.price ?? 0
                  ) || null,
                cost_price:
                  Number(
                    rawItem.product_variants.price_list_items?.[0]?.cost_price ??
                      0
                  ) || null,
                qty_on_hand,
                qty_available,
                qty_reserved,
                attributes_label: rawItem.product_variants.name || '',
              }
            : null,

          uoms: rawItem.uoms || null,

          // Reorder thresholds from reorder_rules
          reorder_point: matchingRule ? Number(matchingRule.reorder_point || 0) : 0,
          min_quantity: matchingRule ? Number(matchingRule.min_qty || 0) : 0,
          max_quantity: matchingRule?.max_qty != null ? Number(matchingRule.max_qty) : null,
          safety_stock: matchingRule ? Number(matchingRule.safety_stock || 0) : 0,
          reorder_quantity: matchingRule ? Number(matchingRule.reorder_qty || 0) : 0,
          lead_time_days: matchingRule?.lead_time_days ?? 1,
          warehouse_id: matchingRule?.warehouse_id || primaryWh?.id || null,
          store_id: matchingRule?.store_id || primaryStore?.store_id || null,
          warehouse_location_id: primaryLoc?.id || null,
          warehouses: primaryWh,
          warehouse_locations: primaryLoc,
          stores: primaryStore,

          // Real-time stock balance metrics
          qty_on_hand,
          qty_reserved,
          qty_available,
          avg_cost: Number(avg_cost) || 0,
          unit_cost:
            Number(avg_cost) ||
            Number(rawItem.product_variants?.price_list_items?.[0]?.cost_price ?? 0) ||
            null,
          condition,

          // Physical coordinates / audit
          aisle: primaryLoc?.aisle ?? null,
          rack: primaryLoc?.rack ?? null,
          shelf: primaryLoc?.shelf ?? null,
          bin: primaryLoc?.bin ?? null,
          last_count_date: null,
          last_restocked_date: null,

          // Compatibility fields
          quantity: qty_on_hand,
          reorder_level: matchingRule ? Number(matchingRule.reorder_point || 0) : 0,
          max_stock_level: matchingRule?.max_qty != null ? Number(matchingRule.max_qty) : null,
          last_restocked: rawItem.updated_at || rawItem.created_at,
          location: primaryLoc?.code || primaryWh?.code || null,
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

      if (!input.product_variant_id || input.product_variant_id === 'none') {
        throw new Error('A valid product variant is required to create an inventory item.')
      }

      // Check if an inventory item already exists for this tenant & variant
      const effectiveTenantId = input.tenant_id || tenantId
      if (effectiveTenantId) {
        const { data: existing } = await supabase
          .from('inventory_items')
          .select('id, sku')
          .eq('product_variant_id', input.product_variant_id)
          .eq('tenant_id', effectiveTenantId)
          .maybeSingle()

        if (existing) {
          throw new Error(`This product variant is already registered in inventory (Item SKU: ${existing.sku}).`)
        }
      }

      // Look up variant SKU / barcode if not passed
      let sku = input.sku
      let barcode = input.barcode
      if ((!sku || !barcode) && input.product_variant_id && input.product_variant_id !== 'none') {
        const { data: v } = await supabase
          .from('product_variants')
          .select('sku, barcode')
          .eq('id', input.product_variant_id)
          .maybeSingle()
        if (v) {
          if (!sku) sku = v.sku
          if (!barcode) barcode = v.barcode
        }
      }

      const itemPayload = {
        tenant_id: effectiveTenantId,
        product_variant_id: input.product_variant_id,
        sku: sku || 'SKU-' + Date.now(),
        barcode: barcode || null,
        is_stockable: input.is_stockable !== false,
        is_sellable: input.is_sellable !== false,
        is_purchasable: input.is_purchasable !== false,
        tracking_type: input.tracking_type || 'NONE',
        unit_of_measure_id:
          input.unit_of_measure_id && input.unit_of_measure_id !== 'none'
            ? input.unit_of_measure_id
            : null,
        status: input.status || 'ACTIVE',
        is_active: input.is_active !== false,
        notes: input.notes || null,
        created_by_user_id: userId,
        updated_by_user_id: userId,
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(itemPayload)
        .select(`
          id,
          tenant_id,
          product_variant_id,
          sku,
          barcode,
          is_stockable,
          is_sellable,
          is_purchasable,
          tracking_type,
          unit_of_measure_id,
          status,
          is_active,
          notes,
          created_at,
          updated_at
        `)
        .single()

      if (error) throw error

      // If reorder thresholds are configured, insert into reorder_rules
      if (
        input.reorder_point != null ||
        input.min_quantity != null ||
        input.max_quantity != null ||
        input.warehouse_id
      ) {
        await supabase.from('reorder_rules').insert({
          tenant_id: input.tenant_id || tenantId,
          product_variant_id: input.product_variant_id,
          warehouse_id:
            input.warehouse_id && input.warehouse_id !== 'none'
              ? input.warehouse_id
              : null,
          store_id:
            input.store_id && input.store_id !== 'none' ? input.store_id : null,
          min_qty: input.min_quantity ?? input.reorder_level ?? 0,
          max_qty: input.max_quantity ?? input.max_stock_level ?? null,
          safety_stock: input.safety_stock ?? 0,
          reorder_point: input.reorder_point ?? input.reorder_level ?? 0,
          reorder_qty: input.reorder_quantity ?? 0,
          lead_time_days: input.lead_time_days ?? 1,
          is_active: true,
          created_by_user_id: userId,
          updated_by_user_id: userId,
        })
      }

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
      id,
      inventory_id,
      ...updates
    }: (InventoryInput | InventoryFormValues) & {
      id?: string
      inventory_id?: string | number
    }) => {
      const { tenantId, userId } = getAuthTenantAndUser()
      const targetId = id || (inventory_id != null ? String(inventory_id) : '')

      if (!targetId || targetId === 'undefined') {
        throw new Error('Valid inventory item ID is required for update.')
      }

      const itemPayload: Record<string, unknown> = {
        updated_by_user_id: userId,
        updated_at: new Date().toISOString(),
      }

      if (updates.sku) itemPayload.sku = updates.sku
      if (updates.barcode !== undefined) itemPayload.barcode = updates.barcode || null
      if (updates.is_stockable !== undefined)
        itemPayload.is_stockable = updates.is_stockable !== false
      if (updates.is_sellable !== undefined)
        itemPayload.is_sellable = updates.is_sellable !== false
      if (updates.is_purchasable !== undefined)
        itemPayload.is_purchasable = updates.is_purchasable !== false
      if (updates.tracking_type) itemPayload.tracking_type = updates.tracking_type
      if (updates.status) itemPayload.status = updates.status
      if (updates.is_active !== undefined)
        itemPayload.is_active = updates.is_active !== false
      if (updates.notes !== undefined) itemPayload.notes = updates.notes || null
      if (updates.unit_of_measure_id !== undefined) {
        itemPayload.unit_of_measure_id =
          updates.unit_of_measure_id && updates.unit_of_measure_id !== 'none'
            ? updates.unit_of_measure_id
            : null
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .update(itemPayload)
        .eq('id', targetId)
        .select()
        .single()

      if (error) throw error

      // Update or insert reorder_rules if variant and reorder parameters exist
      if (updates.product_variant_id && updates.product_variant_id !== 'none') {
        const rrPayload = {
          tenant_id: updates.tenant_id || tenantId,
          product_variant_id: updates.product_variant_id,
          warehouse_id:
            updates.warehouse_id && updates.warehouse_id !== 'none'
              ? updates.warehouse_id
              : null,
          store_id:
            updates.store_id && updates.store_id !== 'none'
              ? updates.store_id
              : null,
          min_qty: updates.min_quantity ?? updates.reorder_level ?? 0,
          max_qty: updates.max_quantity ?? updates.max_stock_level ?? null,
          safety_stock: updates.safety_stock ?? 0,
          reorder_point: updates.reorder_point ?? updates.reorder_level ?? 0,
          reorder_qty: updates.reorder_quantity ?? 0,
          lead_time_days: updates.lead_time_days ?? 1,
          is_active: updates.is_active !== false,
          updated_by_user_id: userId,
          updated_at: new Date().toISOString(),
        }

        const { data: existingRule } = await supabase
          .from('reorder_rules')
          .select('id')
          .eq('product_variant_id', updates.product_variant_id)
          .maybeSingle()

        if (existingRule) {
          await supabase
            .from('reorder_rules')
            .update(rrPayload)
            .eq('id', existingRule.id)
        } else if (updates.reorder_point != null || updates.min_quantity != null) {
          await supabase
            .from('reorder_rules')
            .insert({ ...rrPayload, created_by_user_id: userId })
        }
      }

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
    mutationFn: async (idOrInventoryId: string | number) => {
      const { userId } = getAuthTenantAndUser()
      const targetId = idOrInventoryId != null ? String(idOrInventoryId) : ''

      if (!targetId || targetId === 'undefined') {
        throw new Error('Valid inventory item ID is required for deletion.')
      }

      // Lifecycle rule: Soft deactivate rather than hard delete historical records
      const { error } = await supabase
        .from('inventory_items')
        .update({
          status: 'INACTIVE',
          is_active: false,
          updated_by_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId)

      if (error) throw error
      return targetId
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

export interface UseProductVariantsPaginatedParams {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'sku' | 'name' | 'product_name' | 'created_at' | string
  sortOrder?: 'asc' | 'desc'
  productId?: string | null
  isAssigned?: 'all' | 'assigned' | 'unassigned'
}

export const useProductVariantsPaginated = (params: UseProductVariantsPaginatedParams = {}) => {
  const {
    search = '',
    page = 1,
    pageSize = 10,
    sortBy = 'sku',
    sortOrder = 'asc',
    productId,
    isAssigned = 'all',
  } = params

  return useQuery<PaginatedProductVariantsResult>({
    queryKey: [
      'product-variants-paginated',
      search,
      page,
      pageSize,
      sortBy,
      sortOrder,
      productId ?? 'all',
      isAssigned,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (search.trim()) queryParams.set('search', search.trim())
      queryParams.set('page', String(page))
      queryParams.set('pageSize', String(pageSize))
      if (sortBy) queryParams.set('sortBy', sortBy)
      if (sortOrder) queryParams.set('sortOrder', sortOrder)
      if (productId && productId !== 'all') queryParams.set('productId', productId)
      if (isAssigned && isAssigned !== 'all') queryParams.set('isAssigned', isAssigned)

      // 1. Try server API
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
          const res = await fetch(`/api/inventory/product-variants?${queryParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const json = await res.json()
            if (json.success && Array.isArray(json.items)) {
              return {
                items: json.items,
                pagination: json.pagination ?? {
                  page,
                  pageSize,
                  totalCount: json.items.length,
                  totalPages: Math.ceil(json.items.length / pageSize) || 1,
                  hasNextPage: false,
                  hasPrevPage: false,
                },
              }
            }
          }
        }
      } catch (err) {
        console.warn('API /api/inventory/product-variants fallback to Supabase:', err)
      }

      // 2. Direct Supabase Fallback
      const { tenantId } = getAuthTenantAndUser()
      let query = supabase
        .from('product_variants')
        .select(
          `
          id,
          product_id,
          sku,
          name,
          barcode,
          dimensions,
          weight,
          is_active,
          uom_id,
          price_list_items ( price, cost_price ),
          stock_balances ( qty_on_hand, qty_available, qty_reserved ),
          inventory_items ( id, sku, status, is_active ),
          products ( id, name, sku, barcode, categories ( name ), brands ( name ), base_uom_id )
        `,
          { count: 'exact' }
        )
        .eq('is_active', true)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      if (productId && productId !== 'all') {
        query = query.eq('product_id', productId)
      }

      if (search.trim()) {
        const s = search.trim()
        query = query.or(`sku.ilike.%${s}%,name.ilike.%${s}%,barcode.ilike.%${s}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, count, error } = await query.range(from, to).order('sku')
      if (error) throw error

      const totalCount = count ?? (data?.length || 0)
      const totalPages = Math.ceil(totalCount / pageSize) || 1

      const items: ProductVariantItem[] = (data || []).map((v: any) => {
        const pli = Array.isArray(v.price_list_items) ? v.price_list_items[0] : null
        const sbList = Array.isArray(v.stock_balances) ? v.stock_balances : []
        const onHand = sbList.reduce((sum: number, s: any) => sum + Number(s.qty_on_hand || 0), 0)
        const available = sbList.reduce((sum: number, s: any) => sum + Number(s.qty_available || 0), 0)
        const reserved = sbList.reduce((sum: number, s: any) => sum + Number(s.qty_reserved || 0), 0)
        const inv = Array.isArray(v.inventory_items) ? v.inventory_items[0] : v.inventory_items

        return {
          id: String(v.id),
          product_id: v.product_id ? String(v.product_id) : undefined,
          sku: String(v.sku || ''),
          name: v.name ? String(v.name) : null,
          barcode: v.barcode ? String(v.barcode) : null,
          product_name: v.products?.name ?? '',
          brand_name: v.products?.brands?.name ?? null,
          category_name: v.products?.categories?.name ?? null,
          uom_id: v.uom_id || v.products?.base_uom_id || null,
          dimensions: v.dimensions,
          weight: v.weight ? Number(v.weight) : null,
          is_active: v.is_active !== false,
          price: pli?.price ? Number(pli.price) : 0,
          cost_price: pli?.cost_price != null ? Number(pli.cost_price) : null,
          is_assigned_to_inventory: !!inv,
          inventory_item_id: inv?.id ?? null,
          inventory_item_sku: inv?.sku ?? null,
          inventory_item_status: inv?.status ?? null,
          qty_on_hand: onHand,
          qty_available: available,
          qty_reserved: reserved,
        }
      })

      return {
        items,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      }
    },
  })
}

export const useUomList = () => {
  return useQuery({
    queryKey: ['inventory-uoms-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uoms')
        .select('id, code, name, uom_category, is_base')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return (data || []) as InventoryUomRelation[]
    },
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
