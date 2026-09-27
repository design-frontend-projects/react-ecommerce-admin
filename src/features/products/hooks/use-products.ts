import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useAuthEnabled } from '@/hooks/use-auth-query'
import { useAuthStore } from '@/stores/auth-store'
import type {
  Product,
  VariantRowFormData,
  SupplierRowFormData,
  AttributeDefinition,
} from '../data/schema'
import {
  fetchProductsApi,
  fetchProductApi,
  fetchProductStatsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  fetchAttributeDefinitionsApi,
  createAttributeDefinitionApi,
} from '../data/actions'
import type {
  CreateProductMasterInput,
  UpdateProductMasterInput,
  AttributeDefinitionInput,
} from '@/server/fns/products'

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
  lowStock?: number
  outOfStock?: number
  withVariants?: number
  batchTracked?: number
  serialTracked?: number
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

export const useServerProducts = (params: ProductQueryParams = {}) => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const { getToken } = useAuth()
  const { tenantId } = getAuthTenantAndUser()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, params.pageSize ?? 20)

  return useQuery({
    queryKey: ['products', 'server', tenantId, params, page, pageSize],
    queryFn: async (): Promise<PaginatedProductsResult> => {
      const res = await fetchProductsApi(getToken, {
        ...params,
        page,
        pageSize,
      })
      return res
    },
    placeholderData: (previousData) => previousData,
    enabled: authEnabled,
  })
}

export const useProductsStats = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const { getToken } = useAuth()
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['products', 'stats', tenantId],
    queryFn: async (): Promise<ProductSummaryStats> => {
      const stats = await fetchProductStatsApi(getToken)
      return {
        ...stats,
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
  const { getToken } = useAuth()
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['products', 'list', tenantId],
    queryFn: async (): Promise<Product[]> => {
      const res = await fetchProductsApi(getToken, { pageSize: 100 })
      return res.products
    },
    enabled: authEnabled,
  })
}

export const useProduct = (id?: string | number | null) => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const { getToken } = useAuth()
  const productId = id ? String(id) : null

  return useQuery({
    queryKey: ['products', productId],
    queryFn: async (): Promise<Product | null> => {
      if (!productId) return null
      return fetchProductApi(getToken, productId)
    },
    enabled: Boolean(productId) && authEnabled,
  })
}

export const useCreateProduct = () => {
  const { getToken, has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProductMasterInput) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      return createProductApi(getToken, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

export const useUpdateProduct = () => {
  const { getToken, has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: UpdateProductMasterInput & { id: string | number }) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      return updateProductApi(getToken, String(id), updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

export const useDeleteProduct = () => {
  const { getToken, has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string | number) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      return deleteProductApi(getToken, String(id))
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
      suppliers,
    }: {
      base: Partial<Product> & {
        product_code?: string | null
        name_ar?: string | null
        short_description?: string | null
      }
      variants: Array<VariantRowFormData>
      suppliers?: Array<SupplierRowFormData>
    }) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const input: CreateProductMasterInput = {
        name: base.name || '',
        nameAr: base.name_ar,
        productCode: base.product_code,
        sku: base.sku || '',
        barcode: base.barcode || null,
        description: base.description || null,
        shortDescription: base.short_description || null,
        categoryId: base.category_id || null,
        brandId: base.brandId || base.brand_id || null,
        baseUomId: base.baseUomId || base.base_uom_id || null,
        supplierId: base.supplierId || base.supplier_id || null,
        productType: (base.product_type as any) || 'simple',
        productTypeId: base.product_type_id || null,
        trackingMode: (base.tracking_mode as any) || 'none',
        weight: base.weight != null ? Number(base.weight) : null,
        dimensions: base.dimensions ? String(base.dimensions) : null,
        isActive: base.is_active ?? true,
        isStockItem: base.is_stock_item ?? true,
        reorderable: base.reorderable ?? true,
        isBatchTracked: base.is_batch_tracked ?? false,
        isSerialTracked: base.is_serial_tracked ?? false,
        hasVariants: base.has_variants ?? (variants.length > 1),
        hasExpiration: base.has_expiration ?? false,
        isMarketplace: base.is_marketplace ?? false,
        suppliers: suppliers?.map((s) => ({
          supplierId: s.supplier_id,
          supplierProductCode: s.supplier_product_code,
          supplierBarcode: s.supplier_barcode,
          purchaseUomId: s.purchase_uom_id || null,
          minimumOrderQty: Number(s.minimum_order_qty || 0),
          leadTimeDays: Number(s.lead_time_days || 0),
          unitCost: Number(s.unit_cost || 0),
          isPreferred: Boolean(s.is_preferred),
          isActive: s.is_active ?? true,
        })),
        variants: variants.map((v) => ({
          sku: v.sku,
          barcode: v.barcode || null,
          name: v.name || v.attributes_label || null,
          taxRateId: v.tax_rate_id || null,
          weight: v.weight != null ? Number(v.weight) : null,
          dimensions: v.dimensions ? { label: v.dimensions } : null,
          uomId: v.uom_id || null,
          isActive: v.is_active ?? true,
          expirationDate: v.expiration_date ? String(v.expiration_date) : null,
          price: Number(v.price || 0),
          costPrice: Number(v.cost_price || 0),
          attributes: v.attributes,
        })),
      }

      return createProductApi(getToken, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
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
      suppliers,
    }: {
      id: string | number
      base: Partial<Product> & {
        product_code?: string | null
        name_ar?: string | null
        short_description?: string | null
      }
      variants: Array<VariantRowFormData & { id?: string }>
      suppliers?: Array<SupplierRowFormData>
    }) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }

      const input: UpdateProductMasterInput = {
        name: base.name,
        nameAr: base.name_ar,
        productCode: base.product_code,
        sku: base.sku,
        barcode: base.barcode,
        description: base.description,
        shortDescription: base.short_description,
        categoryId: base.category_id,
        brandId: base.brandId || base.brand_id,
        baseUomId: base.baseUomId || base.base_uom_id,
        supplierId: base.supplierId || base.supplier_id,
        productType: base.product_type as any,
        productTypeId: base.product_type_id,
        trackingMode: base.tracking_mode as any,
        weight: base.weight != null ? Number(base.weight) : undefined,
        dimensions: base.dimensions ? String(base.dimensions) : undefined,
        isActive: base.is_active,
        isStockItem: base.is_stock_item,
        reorderable: base.reorderable,
        isBatchTracked: base.is_batch_tracked,
        isSerialTracked: base.is_serial_tracked,
        hasVariants: base.has_variants,
        hasExpiration: base.has_expiration,
        isMarketplace: base.is_marketplace,
        suppliers: suppliers?.map((s) => ({
          id: s.id,
          supplierId: s.supplier_id,
          supplierProductCode: s.supplier_product_code,
          supplierBarcode: s.supplier_barcode,
          purchaseUomId: s.purchase_uom_id || null,
          minimumOrderQty: Number(s.minimum_order_qty || 0),
          leadTimeDays: Number(s.lead_time_days || 0),
          unitCost: Number(s.unit_cost || 0),
          isPreferred: Boolean(s.is_preferred),
          isActive: s.is_active ?? true,
        })),
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: v.barcode || null,
          name: v.name || v.attributes_label || null,
          taxRateId: v.tax_rate_id || null,
          weight: v.weight != null ? Number(v.weight) : null,
          dimensions: v.dimensions ? { label: v.dimensions } : null,
          uomId: v.uom_id || null,
          isActive: v.is_active ?? true,
          expirationDate: v.expiration_date ? String(v.expiration_date) : null,
          price: Number(v.price || 0),
          costPrice: Number(v.cost_price || 0),
          attributes: v.attributes,
        })),
      }

      return updateProductApi(getToken, String(id), input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      queryClient.invalidateQueries({ queryKey: ['price-list'] })
    },
  })
}

// ── Attribute Definitions Hooks ─────────────────────────────────────────────

export const useAttributeDefinitions = () => {
  const { authEnabled } = useAuthEnabled({ permission: 'products.view' })
  const { getToken } = useAuth()
  const { tenantId } = getAuthTenantAndUser()

  return useQuery({
    queryKey: ['attribute-definitions', tenantId],
    queryFn: async (): Promise<AttributeDefinition[]> => {
      return fetchAttributeDefinitionsApi(getToken)
    },
    enabled: authEnabled,
  })
}

export const useCreateAttributeDefinition = () => {
  const { getToken, has } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AttributeDefinitionInput) => {
      if (!has({ permission: 'products.manage' })) {
        throw new Error('You do not have permission to perform this action.')
      }
      return createAttributeDefinitionApi(getToken, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attribute-definitions'] })
    },
  })
}
