import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { type Product } from '../data/schema'
import type { VariantRowFormData } from '../data/product-wizard-schema'

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

      // 2. Insert variants, assigning product_id
      const variantsWithProductId = variants.map((v) => ({
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        cost_price: v.cost_price,
        stock_quantity: v.stock_quantity,
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

      return { product, variants: createdVariants }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
