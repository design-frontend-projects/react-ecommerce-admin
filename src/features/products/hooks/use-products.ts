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

export interface ProductQueryParams {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string | string[]
  brandId?: string | string[]
  baseUomId?: string | string[]
  supplierId?: string | string[]
  productType?: string | string[]
  quickFilter?: string | null
  isActive?: boolean | null
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedProductsResult {
  products: Product[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ProductSummaryStats {
  total: number
  active: number
  inactive: number
  lowStock: number
  outOfStock: number
}

type ProductQueryBuilder = ReturnType<
  ReturnType<typeof supabase.from>['select']
>

export const useServerProducts = (params: ProductQueryParams = {}) => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const { tenantId } = getAuthTenantAndUser()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, params.pageSize ?? 20)

  return useQuery({
    queryKey: ['products', 'server', tenantId, params, page, pageSize],
    queryFn: async (): Promise<PaginatedProductsResult> => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Helper function to apply common filters to any query builder
      const applyFilters = (builder: ProductQueryBuilder): ProductQueryBuilder => {
        let b = builder.neq('is_deleted', true)

        if (tenantId) {
          b = b.eq('tenant_id', tenantId)
        }

        // Server-side text search across name, sku, barcode, description
        if (params.search && params.search.trim()) {
          const term = params.search.trim()
          b = b.or(
            `name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%,description.ilike.%${term}%`
          )
        }

        // Filters
        if (params.categoryId) {
          const cats = Array.isArray(params.categoryId)
            ? params.categoryId.filter(Boolean)
            : [params.categoryId].filter(Boolean)
          if (cats.length > 0) {
            b = b.in('category_id', cats)
          }
        }

        if (params.brandId) {
          const brands = Array.isArray(params.brandId)
            ? params.brandId.filter(Boolean)
            : [params.brandId].filter(Boolean)
          if (brands.length > 0) {
            b = b.in('brand_id', brands)
          }
        }

        if (params.baseUomId) {
          const uoms = Array.isArray(params.baseUomId)
            ? params.baseUomId.filter(Boolean)
            : [params.baseUomId].filter(Boolean)
          if (uoms.length > 0) {
            b = b.in('base_uom_id', uoms)
          }
        }

        if (params.supplierId) {
          const sups = Array.isArray(params.supplierId)
            ? params.supplierId.filter(Boolean)
            : [params.supplierId].filter(Boolean)
          if (sups.length > 0) {
            b = b.in('supplier_id', sups)
          }
        }

        if (params.productType) {
          const types = Array.isArray(params.productType)
            ? params.productType.filter(Boolean)
            : [params.productType].filter(Boolean)
          if (types.length > 0) {
            b = b.in('product_type', types)
          }
        }

        if (params.isActive !== undefined && params.isActive !== null) {
          b = b.eq('is_active', params.isActive)
        }

        if (params.quickFilter === 'inactive') {
          b = b.eq('is_active', false)
        }

        return b
      }

      // 1. Data query (products + parent lookup tables only; excludes heavy one-to-many variant joins that exceed statement timeout)
      let dataQuery = supabase
        .from('products')
        .select(
          '*, categories(id, name, name_ar), brands(id, name, name_ar, code), base_uom:uoms(id, name, code), suppliers(id, name, code), product_types!products_product_type_id_fkey(id, name, name_ar, code, icon, color)'
        )
      dataQuery = applyFilters(dataQuery)

      const sortColumn = params.sortBy || 'created_at'
      const ascending = params.sortOrder === 'asc'
      dataQuery = dataQuery.order(sortColumn, { ascending }).range(from, to)

      // 2. Count query (lightweight head-only query with exact count)
      let countQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
      countQuery = applyFilters(countQuery)

      // Execute data and count queries in parallel
      const [dataRes, countRes] = await Promise.all([dataQuery, countQuery])
      if (dataRes.error) throw dataRes.error
      if (countRes.error) throw countRes.error

      const rawRows = (dataRes.data as Record<string, unknown>[] | null) || []
      const pIds = rawRows.map((r) => String(r.id || '')).filter(Boolean)

      // 3. Batch lookup variants and price list items for the retrieved page of products only
      const variantsMap = new Map<string, Record<string, unknown>[]>()
      const pricesMap = new Map<string, Record<string, unknown>[]>()

      if (pIds.length > 0) {
        const [variantsRes, pricesRes] = await Promise.all([
          supabase
            .from('product_variants')
            .select(
              '*, tax_rates(id, tax_type, rate, is_inclusive), price_list_items(*), stock_balances(*)'
            )
            .in('product_id', pIds),
          supabase
            .from('price_list_items')
            .select('*')
            .in('product_id', pIds),
        ])

        if (variantsRes.data) {
          for (const v of variantsRes.data as Record<string, unknown>[]) {
            const productId = String(v.product_id || '')
            const list = variantsMap.get(productId) || []
            list.push(v)
            variantsMap.set(productId, list)
          }
        }

        if (pricesRes.data) {
          for (const pr of pricesRes.data as Record<string, unknown>[]) {
            const productId = String(pr.product_id || '')
            const list = pricesMap.get(productId) || []
            list.push(pr)
            pricesMap.set(productId, list)
          }
        }
      }

      const products = rawRows.map((row) => {
        const pId = String(row.id || '')
        return normalizeProduct({
          ...row,
          product_variants: variantsMap.get(pId) || [],
          price_list_items: pricesMap.get(pId) || [],
        })
      })

      const totalCount = countRes.count ?? products.length
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

      return {
        products,
        totalCount,
        page,
        pageSize,
        totalPages,
      }
    },
    placeholderData: (previousData) => previousData,
    enabled: authEnabled,
  })
}

export const useProductsStats = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['products', 'stats', tenantId],
    queryFn: async (): Promise<ProductSummaryStats> => {
      let totalQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .neq('is_deleted', true)

      let inactiveQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .neq('is_deleted', true)
        .eq('is_active', false)

      if (tenantId) {
        totalQuery = totalQuery.eq('tenant_id', tenantId)
        inactiveQuery = inactiveQuery.eq('tenant_id', tenantId)
      }

      const [totalRes, inactiveRes] = await Promise.all([
        totalQuery,
        inactiveQuery,
      ])

      const total = totalRes.count ?? 0
      const inactive = inactiveRes.count ?? 0
      const active = Math.max(0, total - inactive)

      return {
        total,
        active,
        inactive,
        lowStock: 0,
        outOfStock: 0,
      }
    },
    enabled: authEnabled,
    staleTime: 60000,
  })
}

export const useProducts = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(
          '*, product_variants(*, tax_rates(id, tax_type, rate, is_inclusive), price_list_items(*), stock_balances(*)), price_list_items(*), categories(id, name, name_ar), brands(id, name, name_ar, code), base_uom:uoms(id, name, code), suppliers(id, name, code), product_types!products_product_type_id_fkey(id, name, name_ar, code, icon, color)'
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
          '*, product_variants(*, tax_rates(id, tax_type, rate, is_inclusive), price_list_items(*), stock_balances(*)), price_list_items(*), categories(id, name, name_ar), brands(id, name, name_ar, code), base_uom:uoms(id, name, code), suppliers(id, name, code), product_types!products_product_type_id_fkey(id, name, name_ar, code, icon, color)'
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

      delete finalProductPayload.reorder_level
      delete finalProductPayload.expiration_date

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

      // 2. Insert variants
      if (variants.length > 0) {
        const variantsWithProductId = variants.map((v) => ({
          product_id: productId,
          tenant_id: productTenantId,
          sku: v.sku,
          barcode: v.barcode || null,
          name: v.name || v.attributes_label || null,
          tax_rate_id: v.tax_rate_id || null,
          weight: v.weight ?? null,
          uom_id: v.uom_id || null,
          dimensions: v.attributes_label
            ? JSON.stringify({ label: v.attributes_label })
            : v.dimensions
              ? JSON.stringify({ label: v.dimensions })
              : null,
          is_active: v.is_active ?? true,
          expiration_date: v.expiration_date
            ? typeof v.expiration_date === 'string'
              ? v.expiration_date.split('T')[0]
              : new Date(v.expiration_date).toISOString().split('T')[0]
            : null,
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

        // 3. Upsert variant prices into the Tenant's Default Price List
        try {
          let defaultPlId: string | null = null
          const { data: defaultPl } = await supabase
            .from('price_list')
            .select('id')
            .eq('is_default', true)
            .eq('tenant_id', productTenantId)
            .maybeSingle()

          if (defaultPl) {
            defaultPlId = defaultPl.id
          } else {
            const { data: newPl } = await supabase
              .from('price_list')
              .insert({
                tenant_id: productTenantId,
                name: 'Default Base Price List',
                code: 'DEFAULT',
                is_default: true,
                is_active: true,
                start_date: new Date().toISOString().slice(0, 10),
                created_by_user_id: userId,
              })
              .select('id')
              .single()
            if (newPl) defaultPlId = newPl.id
          }

          if (defaultPlId && createdVariants && createdVariants.length > 0) {
            const priceItems = createdVariants.map((created, index) => {
              const vAny = variants[index] as { price?: number; cost_price?: number } | undefined
              return {
                tenant_id: productTenantId,
                price_list_id: defaultPlId!,
                product_variant_id: created.id as string,
                product_id: productId,
                price: Number(vAny?.price || 0),
                cost_price: Number(vAny?.cost_price || 0),
                min_price: 0,
                max_discount_percent: 0,
                created_by_user_id: userId,
              }
            })

            await supabase
              .from('price_list_items')
              .upsert(priceItems, { onConflict: 'price_list_id,product_variant_id' })
          }
        } catch (plErr) {
          // eslint-disable-next-line no-console
          console.error('Failed to sync price list items for new product:', plErr)
        }

        // 4. Post initial quantities as opening_stock movements if store is specified
        const storeId = (base as { store_id?: string | null }).store_id
        if (storeId && createdVariants) {
          const openingItems = createdVariants
            .map((created, index) => {
              const vAny = variants[index] as { stock_quantity?: number; cost_price?: number } | undefined
              return {
                productVariantId: created.id as string,
                qty: vAny?.stock_quantity ?? 0,
                unitCost: vAny?.cost_price ?? undefined,
              }
            })
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
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['default-price-list'] })
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

      delete finalProductUpdate.reorder_level
      delete finalProductUpdate.expiration_date

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
        tax_rate_id: v.tax_rate_id || null,
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
        expiration_date: v.expiration_date
          ? typeof v.expiration_date === 'string'
            ? v.expiration_date.split('T')[0]
            : new Date(v.expiration_date).toISOString().split('T')[0]
          : null,
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
            .map((created, index) => {
              const vAny = newToInsert[index] as { stock_quantity?: number; cost_price?: number } | undefined
              return {
                productVariantId: created.id as string,
                qty: vAny?.stock_quantity ?? 0,
                unitCost: vAny?.cost_price ?? undefined,
              }
            })
            .filter((item) => item.qty > 0)

          if (openingItems.length > 0) {
            await postOpeningStock(getToken, storeId, openingItems)
          }
        }
      }

      // Sync variant prices into the Tenant's Default Price List
      try {
        const { data: defaultPl } = await supabase
          .from('price_list')
          .select('id')
          .eq('is_default', true)
          .eq('tenant_id', productTenantId)
          .maybeSingle()

        if (defaultPl) {
          const allVariantsToSync = [
            ...existingToUpdate.map((v) => {
              const vAny = v as { price?: number; cost_price?: number }
              return {
                variantId: v.id!,
                price: Number(vAny.price || 0),
                costPrice: Number(vAny.cost_price || 0),
              }
            }),
            ...(insertedVariants || []).map((iv, idx) => {
              const vAny = newToInsert[idx] as { price?: number; cost_price?: number } | undefined
              return {
                variantId: iv.id as string,
                price: Number(vAny?.price || 0),
                costPrice: Number(vAny?.cost_price || 0),
              }
            }),
          ].filter((item) => item.price > 0)

          if (allVariantsToSync.length > 0) {
            const priceItems = allVariantsToSync.map((v) => ({
              tenant_id: productTenantId,
              price_list_id: defaultPl.id,
              product_variant_id: v.variantId,
              product_id: cleanProductId,
              price: v.price,
              cost_price: v.costPrice,
              min_price: 0,
              max_discount_percent: 0,
              updated_by_user_id: userId,
            }))
            await supabase
              .from('price_list_items')
              .upsert(priceItems, { onConflict: 'price_list_id,product_variant_id' })
          }
        }
      } catch (plErr) {
        // eslint-disable-next-line no-console
        console.error('Failed to sync price list items on update:', plErr)
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
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
      queryClient.invalidateQueries({ queryKey: ['price-lists'] })
      queryClient.invalidateQueries({ queryKey: ['default-price-list'] })
    },
  })
}
