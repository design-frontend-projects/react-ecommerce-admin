import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authorizedRequest } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import type { VariantRowFormData, Product } from '../data/schema'

/**
 * Initial quantities are never written to product_variants.stock_quantity directly
 * (a denormalized cache owned by the SQL movement engine). They are posted as
 * idempotent `opening_stock` movements instead, keyed per (variant, store).
 */
async function postOpeningStock(
  getToken: () => Promise<string | null>,
  storeId: string,
  items: Array<{ productVariantId: string; qty: number; unitCost?: number }>
) {
  if (items.length === 0) return
  await authorizedRequest(getToken, '/api/inventory/opening-stock', {
    method: 'POST',
    body: JSON.stringify({ storeId, items }),
  })
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

function normalizeProduct(raw: Record<string, unknown>): Product {
  const pId = (raw.id || raw.product_id) as string | undefined
  return {
    ...raw,
    name: String(raw.name || ''),
    sku: String(raw.sku || ''),
    id: pId,
    product_id: pId,
  } as Product
}

export const useProducts = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(
          '*, product_variants(*), categories(id, name), brands(id, name, code), base_uom:uoms(id, name, code), product_types(id, name, name_ar, code, icon, color)'
        )
        .neq('is_deleted', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map((row) => normalizeProduct(row as Record<string, unknown>))
    },
    enabled: authEnabled,
  })
}

export const useProduct = (id?: string | number | null) => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const productId = id ? String(id) : null

  return useQuery({
    queryKey: ['products', productId],
    queryFn: async () => {
      if (!productId) return null
      const { data, error } = await supabase
        .from('products')
        .select(
          '*, product_variants(*), categories(id, name), brands(id, name, code), base_uom:uoms(id, name, code), product_types(id, name, name_ar, code, icon, color)'
        )
        .eq('id', productId)
        .maybeSingle()

      if (error) throw error
      return data ? normalizeProduct(data as Record<string, unknown>) : null
    },
    enabled: Boolean(productId) && authEnabled,
  })
}

export const useCreateProduct = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      newProduct: Omit<Product, 'id' | 'product_id' | 'created_at' | 'updated_at'>
    ) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()

      const {
        product_variants: _pv,
        categories: _cat,
        brands: _br,
        base_uom: _uom,
        suppliers: _sup,
        product_types: _pt,
        product_id: _legacyPid,
        id: _ignoredId,
        cost_price: _costPrice,
        store_id: _storeId,
        pos_reorder_requests: _prr,
        purchase_order_items: _poi,
        variants: _vars,
        attributes_label: _al,
        ...productPayload
      } = newProduct as Record<string, unknown>

      const payloadToInsert: Record<string, unknown> = {
        ...productPayload,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (tenantId && !payloadToInsert.tenant_id) {
        payloadToInsert.tenant_id = tenantId
      }
      if (userId && !payloadToInsert.created_by_user_id) {
        payloadToInsert.created_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('products')
        .insert(payloadToInsert)
        .select()
        .maybeSingle()

      if (error) throw error
      return data ? normalizeProduct(data as Record<string, unknown>) : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdateProduct = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Product> & { id: string | number }) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { userId } = getAuthTenantAndUser()
      const cleanId = String(id)

      const {
        product_variants: _pv,
        categories: _cat,
        brands: _br,
        base_uom: _uom,
        suppliers: _sup,
        product_types: _pt,
        product_id: _legacyPid,
        id: _ignoredId,
        cost_price: _costPrice,
        store_id: _storeId,
        pos_reorder_requests: _prr,
        purchase_order_items: _poi,
        variants: _vars,
        attributes_label: _al,
        ...productPayload
      } = updates as Record<string, unknown>

      const payloadToUpdate: Record<string, unknown> = {
        ...productPayload,
        updated_at: new Date().toISOString(),
      }

      if (userId) {
        payloadToUpdate.updated_by_user_id = userId
      }

      const { data, error } = await supabase
        .from('products')
        .update(payloadToUpdate)
        .eq('id', cleanId)
        .select()
        .maybeSingle()

      if (error) throw error
      return data ? normalizeProduct(data as Record<string, unknown>) : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useDeleteProduct = () => {
  const { has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string | number) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const cleanId = String(id)
      const { error } = await supabase
        .from('products')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useCreateProductWithVariants = () => {
  const queryClient = useQueryClient()
  const { getToken, has } = useAuth()

  return useMutation({
    mutationFn: async ({
      base,
      variants,
    }: {
      base: Partial<Product>
      variants: Array<VariantRowFormData>
    }) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()

      // Filter out relation properties and client-only helpers from base payload
      const {
        product_variants: _pv,
        categories: _cat,
        brands: _br,
        base_uom: _uom,
        suppliers: _sup,
        product_types: _pt,
        product_id: _legacyPid,
        id: _ignoredId,
        cost_price: _costPrice,
        store_id: _storeId,
        pos_reorder_requests: _prr,
        purchase_order_items: _poi,
        variants: _vars,
        attributes_label: _al,
        ...productPayload
      } = base as Partial<Product> & Record<string, unknown>

      const resolvedTenantId =
        (productPayload.tenant_id as string | undefined) || tenantId || undefined

      const finalProductPayload: Record<string, unknown> = {
        ...productPayload,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (resolvedTenantId && !finalProductPayload.tenant_id) {
        finalProductPayload.tenant_id = resolvedTenantId
      }
      if (userId && !finalProductPayload.created_by_user_id) {
        finalProductPayload.created_by_user_id = userId
      }

      // 1. Insert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(finalProductPayload)
        .select()
        .single()

      if (productError) throw productError
      if (!product) throw new Error('Failed to create product')

      const productId = product.id as string
      const productTenantId = (product.tenant_id as string) || resolvedTenantId

      // 2. Insert variants with zero stock — quantities go through the engine
      if (variants.length > 0) {
        const variantsWithProductId = variants.map((v) => ({
          product_id: productId,
          tenant_id: productTenantId,
          sku: v.sku,
          barcode: v.barcode || null,
          name: v.name || v.attributes_label || null,
          price: v.price,
          cost_price: v.cost_price ?? null,
          stock_quantity: 0,
          min_stock: v.min_stock ?? 0,
          weight: v.weight ?? null,
          uom_id: v.uom_id || null,
          dimensions: v.attributes_label
            ? JSON.stringify({ label: v.attributes_label })
            : v.dimensions
              ? JSON.stringify({ label: v.dimensions })
              : null,
          is_active: v.is_active ?? true,
          created_by_user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        const { data: createdVariants, error: variantsError } = await supabase
          .from('product_variants')
          .insert(variantsWithProductId)
          .select()

        if (variantsError) {
          // Rollback newly created product
          await supabase.from('products').delete().eq('id', productId)
          throw variantsError
        }

        // 3. Post initial quantities as opening_stock movements if store is specified
        const storeId = (base as { store_id?: string | null }).store_id
        if (storeId && createdVariants) {
          const openingItems = createdVariants
            .map((created, index) => ({
              productVariantId: created.id as string,
              qty: variants[index]?.stock_quantity ?? 0,
              unitCost: variants[index]?.cost_price ?? undefined,
            }))
            .filter((item) => item.qty > 0)

          if (openingItems.length > 0) {
            await postOpeningStock(getToken, storeId, openingItems)
          }
        }

        return {
          product: normalizeProduct(product as Record<string, unknown>),
          variants: createdVariants,
        }
      }

      return { product: normalizeProduct(product as Record<string, unknown>), variants: [] }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
    },
  })
}

export const useUpdateProductWithVariants = () => {
  const queryClient = useQueryClient()
  const { getToken, has } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      base,
      variants,
    }: {
      id: string | number
      base: Partial<Product>
      variants: Array<VariantRowFormData & { id?: string }>
    }) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const { tenantId, userId } = getAuthTenantAndUser()
      const cleanProductId = String(id)

      // Clean up base payload
      const {
        product_variants: _pv,
        categories: _cat,
        brands: _br,
        base_uom: _uom,
        suppliers: _sup,
        product_types: _pt,
        product_id: _legacyPid,
        id: _ignoredId,
        cost_price: _costPrice,
        store_id: _storeId,
        pos_reorder_requests: _prr,
        purchase_order_items: _poi,
        variants: _vars,
        attributes_label: _al,
        ...productPayload
      } = base as Partial<Product> & Record<string, unknown>

      const finalProductUpdate: Record<string, unknown> = {
        ...productPayload,
        updated_at: new Date().toISOString(),
      }

      if (userId) {
        finalProductUpdate.updated_by_user_id = userId
      }

      // 1. Update product
      const { data: product, error: productError } = await supabase
        .from('products')
        .update(finalProductUpdate)
        .eq('id', cleanProductId)
        .select()
        .single()

      if (productError) throw productError

      const productTenantId =
        (product?.tenant_id as string | undefined) ||
        (productPayload.tenant_id as string | undefined) ||
        tenantId ||
        undefined

      // 2. Fetch existing variants to know what to delete
      const { data: existingVariants, error: fetchError } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', cleanProductId)

      if (fetchError) throw fetchError

      const existingVariantIds = (existingVariants || []).map((v) => v.id as string)
      const incomingVariantIds = variants.filter((v) => v.id).map((v) => v.id as string)

      // Variants to delete
      const variantsToDelete = existingVariantIds.filter(
        (vId) => !incomingVariantIds.includes(vId)
      )

      if (variantsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_variants')
          .delete()
          .in('id', variantsToDelete)

        if (deleteError) throw deleteError
      }

      // 3. Build helper for variant payload
      const buildVariantPayload = (
        v: VariantRowFormData & { id?: string }
      ) => ({
        product_id: cleanProductId,
        sku: v.sku,
        barcode: v.barcode || null,
        name: v.name || v.attributes_label || null,
        price: v.price,
        cost_price: v.cost_price ?? null,
        min_stock: v.min_stock ?? 0,
        weight: v.weight ?? null,
        uom_id: v.uom_id || null,
        dimensions: v.attributes_label
          ? JSON.stringify({ label: v.attributes_label })
          : v.dimensions
            ? typeof v.dimensions === 'string'
              ? JSON.stringify({ label: v.dimensions })
              : v.dimensions
            : null,
        is_active: v.is_active ?? true,
        updated_at: new Date().toISOString(),
        ...(userId ? { updated_by_user_id: userId } : {}),
      })

      const existingToUpdate = variants.filter((v) => v.id)
      const newToInsert = variants.filter((v) => !v.id)

      // Update existing variants
      for (const v of existingToUpdate) {
        const { error: updateErr } = await supabase
          .from('product_variants')
          .update(buildVariantPayload(v))
          .eq('id', v.id!)

        if (updateErr) throw updateErr
      }

      // Insert new variants
      let insertedVariants = null
      if (newToInsert.length > 0) {
        const { data, error: insertErr } = await supabase
          .from('product_variants')
          .insert(
            newToInsert.map((v) => ({
              ...buildVariantPayload(v),
              tenant_id: productTenantId,
              created_by_user_id: userId,
              stock_quantity: 0,
              created_at: new Date().toISOString(),
            }))
          )
          .select()

        if (insertErr) throw insertErr
        insertedVariants = data

        // Initial quantities for NEW variants go through the movement engine
        const storeId = (product as { store_id?: string | null } | null)?.store_id
        if (storeId && insertedVariants) {
          const openingItems = insertedVariants
            .map((created, index) => ({
              productVariantId: created.id as string,
              qty: newToInsert[index]?.stock_quantity ?? 0,
              unitCost: newToInsert[index]?.cost_price ?? undefined,
            }))
            .filter((item) => item.qty > 0)

          if (openingItems.length > 0) {
            await postOpeningStock(getToken, storeId, openingItems)
          }
        }
      }

      return {
        product: normalizeProduct(product as Record<string, unknown>),
        variants: insertedVariants,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
    },
  })
}
