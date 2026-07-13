import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { authorizedRequest } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'
import { type Product } from '../data/schema'
import type { VariantRowFormData } from '../data/product-wizard-schema'

/**
 * Initial quantities are never written to product_variants.stock_quantity
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

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .neq('is_deleted', true)
        .order('name')

      if (error) throw error
      return data as Product[]
    },
  })
}

export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_id', id)
        .maybeSingle()

      if (error) throw error
      return data as Product
    },
    enabled: !!id,
  })
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      newProduct: Omit<Product, 'product_id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('products')
        .insert(newProduct)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Product> & { id: number }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('product_id', id)
        .select()
        .maybeSingle()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('product_id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useCreateProductWithVariants = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      base,
      variants,
    }: {
      base: Omit<Product, 'product_id' | 'created_at' | 'updated_at' | 'product_variants' | 'categories'>
      variants: Array<VariantRowFormData>
    }) => {
      // 1. Insert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(base)
        .select()
        .single()

      if (productError) throw productError

      if (!product) throw new Error('Failed to create product')

      // 2. Insert variants with zero stock — quantities go through the engine
      const variantsWithProductId = variants.map((v) => ({
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        cost_price: v.cost_price,
        stock_quantity: 0,
        min_stock: v.min_stock,
        weight: v.weight,
        dimensions: v.attributes_label ? JSON.stringify({ label: v.attributes_label }) : null,
        product_id: product.product_id,
      }))

      const { data: createdVariants, error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantsWithProductId)
        .select()

      if (variantsError) {
        // Rollback
        await supabase.from('products').delete().eq('product_id', product.product_id)
        throw variantsError
      }

      // 3. Post initial quantities as opening_stock movements (needs a store)
      const storeId = (base as { store_id?: string | null }).store_id
      if (storeId && createdVariants) {
        const openingItems = createdVariants
          .map((created, index) => ({
            productVariantId: created.id as string,
            qty: variants[index]?.stock_quantity ?? 0,
            unitCost: variants[index]?.cost_price ?? undefined,
          }))
          .filter((item) => item.qty > 0)
        await postOpeningStock(getToken, storeId, openingItems)
      }

      return { product, variants: createdVariants }
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
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      base,
      variants,
    }: {
      id: number
      base: Partial<Product>
      variants: Array<VariantRowFormData & { id?: string }>
    }) => {
      // 1. Update product
      const { data: product, error: productError } = await supabase
        .from('products')
        .update(base)
        .eq('product_id', id)
        .select()
        .single()

      if (productError) throw productError

      // 2. Fetch existing variants to know what to delete
      const { data: existingVariants, error: fetchError } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id)
      
      if (fetchError) throw fetchError

      const existingVariantIds = existingVariants?.map(v => v.id) || []
      const incomingVariantIds = variants.filter(v => v.id).map(v => v.id)
      
      // Variants to delete (were in DB but not in incoming variants)
      const variantsToDelete = existingVariantIds.filter(vId => !incomingVariantIds.includes(vId))
      
      if (variantsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_variants')
          .delete()
          .in('id', variantsToDelete)
        
        if (deleteError) throw deleteError
      }

      // 3. Separate new variants (INSERT) from existing variants (UPDATE).
      // stock_quantity is intentionally absent: the cache is engine-owned and
      // existing stock is changed via Stock Adjustments, never here.
      const buildVariantPayload = (v: VariantRowFormData & { id?: string }) => ({
        product_id: id,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        cost_price: v.cost_price,
        min_stock: v.min_stock,
        weight: v.weight,
        dimensions: v.attributes_label ? JSON.stringify({ label: v.attributes_label }) : v.dimensions,
        is_active: v.is_active,
      })

      const existingToUpdate = variants.filter(v => v.id)
      const newToInsert = variants.filter(v => !v.id)

      // Update existing variants one by one
      for (const v of existingToUpdate) {
        const { error: updateErr } = await supabase
          .from('product_variants')
          .update(buildVariantPayload(v))
          .eq('id', v.id!)

        if (updateErr) throw updateErr
      }

      // Insert new variants (no id — let DB generate UUID)
      let insertedVariants = null
      if (newToInsert.length > 0) {
        const { data, error: insertErr } = await supabase
          .from('product_variants')
          .insert(newToInsert.map((v) => ({ ...buildVariantPayload(v), stock_quantity: 0 })))
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
          await postOpeningStock(getToken, storeId, openingItems)
        }
      }

      return { product, variants: insertedVariants }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
    },
  })
}
