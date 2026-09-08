import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { type Inventory, type InventoryFormValues } from '../data/schema'

export interface InventoryInput {
  product_id: string
  product_variant_id?: string | null
  quantity: number
  reorder_point?: number | null
  min_quantity?: number | null
  max_quantity?: number | null
  last_count_date?: string | null
  store_id?: string | null
  tenant_id?: string | null
  // Compatibility aliases
  reorder_level?: number | null
  max_stock_level?: number | null
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
      let query = supabase
        .from('inventory')
        .select(`
          inventory_id,
          product_id,
          product_variant_id,
          quantity,
          reorder_point,
          min_quantity,
          max_quantity,
          last_count_date,
          store_id,
          tenant_id,
          created_at,
          updated_at,
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
          )
        `)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query.order('inventory_id', { ascending: false })

      if (error) throw error

      // Normalize reorder_level / max_stock_level aliases for table consumption
      return (data || []).map((item: any) => ({
        ...item,
        reorder_level: item.reorder_point ?? item.min_quantity ?? 0,
        max_stock_level: item.max_quantity ?? null,
        last_restocked: item.last_count_date ?? item.updated_at ?? item.created_at,
      })) as Inventory[]
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
        quantity: input.quantity ?? 0,
        reorder_point: input.reorder_point ?? input.reorder_level ?? 0,
        min_quantity: input.min_quantity ?? input.reorder_level ?? 0,
        max_quantity: input.max_quantity ?? input.max_stock_level ?? null,
        last_count_date: input.last_count_date || new Date().toISOString(),
        store_id: input.store_id || null,
        tenant_id: input.tenant_id || tenantId,
        created_by_user_id: userId,
        updated_by_user_id: userId,
      }

      const { data, error } = await supabase
        .from('inventory')
        .insert(payload)
        .select(`
          inventory_id,
          product_id,
          product_variant_id,
          quantity,
          reorder_point,
          min_quantity,
          max_quantity,
          last_count_date,
          store_id,
          tenant_id,
          products (id, name, sku, has_variants),
          product_variants (id, product_id, name, sku)
        `)
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

      const payload: Record<string, any> = {
        product_id: updates.product_id,
        product_variant_id: updates.product_variant_id || null,
        quantity: updates.quantity,
        reorder_point: updates.reorder_point ?? updates.reorder_level ?? 0,
        min_quantity: updates.min_quantity ?? updates.reorder_level ?? 0,
        max_quantity: updates.max_quantity ?? updates.max_stock_level ?? null,
        updated_by_user_id: userId,
        updated_at: new Date().toISOString(),
      }

      if (updates.last_count_date) {
        payload.last_count_date = updates.last_count_date
      }
      if (updates.store_id !== undefined) {
        payload.store_id = updates.store_id || null
      }

      const { data, error } = await supabase
        .from('inventory')
        .update(payload)
        .eq('inventory_id', inventory_id)
        .select(`
          inventory_id,
          product_id,
          product_variant_id,
          quantity,
          reorder_point,
          min_quantity,
          max_quantity,
          last_count_date,
          store_id,
          tenant_id,
          products (id, name, sku, has_variants),
          product_variants (id, product_id, name, sku)
        `)
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
      return data || []
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
        .select('id, product_id, sku, name, is_active')
        .eq('product_id', productId)
        .order('sku')

      if (error) throw error
      return data || []
    },
    enabled: !!productId,
  })
}
