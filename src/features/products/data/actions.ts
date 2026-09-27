import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import type {
  Product,
  ProductQueryParams,
  PaginatedProductsResult,
  ProductSummaryStats,
} from '../hooks/use-products'
import type { AttributeDefinition } from './schema'
import type {
  CreateProductMasterInput,
  UpdateProductMasterInput,
  AttributeDefinitionInput,
} from '@/server/fns/products'

const BASE = '/api/inventory/products'
const ATTR_BASE = '/api/inventory/attributes'

export async function fetchProductsApi(
  getToken: TokenGetter,
  params: ProductQueryParams = {}
): Promise<PaginatedProductsResult> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.quickFilter) query.set('quickFilter', params.quickFilter)
  if (params.isActive !== undefined && params.isActive !== null) {
    query.set('isActive', String(params.isActive))
  }
  if (params.sortBy) query.set('sortBy', params.sortBy)
  if (params.sortOrder) query.set('sortOrder', params.sortOrder)

  if (params.categoryId) {
    const list = Array.isArray(params.categoryId) ? params.categoryId : [params.categoryId]
    list.forEach((c) => query.append('categoryId', c))
  }
  if (params.brandId) {
    const list = Array.isArray(params.brandId) ? params.brandId : [params.brandId]
    list.forEach((b) => query.append('brandId', b))
  }
  if (params.baseUomId) {
    const list = Array.isArray(params.baseUomId) ? params.baseUomId : [params.baseUomId]
    list.forEach((u) => query.append('baseUomId', u))
  }
  if (params.supplierId) {
    const list = Array.isArray(params.supplierId) ? params.supplierId : [params.supplierId]
    list.forEach((s) => query.append('supplierId', s))
  }
  if (params.productType) {
    const list = Array.isArray(params.productType) ? params.productType : [params.productType]
    list.forEach((t) => query.append('productType', t))
  }

  const url = `${BASE}${query.toString() ? `?${query.toString()}` : ''}`
  const response = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: PaginatedProductsResult
  }
  return response.data
}

export async function fetchProductApi(
  getToken: TokenGetter,
  id: string
): Promise<Product | null> {
  const response = (await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`
  )) as { success: boolean; data: Product }
  return response.data ?? null
}

export async function fetchProductStatsApi(
  getToken: TokenGetter
): Promise<ProductSummaryStats> {
  const response = (await authorizedRequest(getToken, `${BASE}?stats=true`)) as {
    success: boolean
    data: ProductSummaryStats
  }
  return response.data
}

export async function createProductApi(
  getToken: TokenGetter,
  input: CreateProductMasterInput
): Promise<Product> {
  const response = (await authorizedRequest(getToken, BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })) as { success: boolean; data: Product }
  return response.data
}

export async function updateProductApi(
  getToken: TokenGetter,
  id: string,
  input: UpdateProductMasterInput
): Promise<Product> {
  const response = (await authorizedRequest(
    getToken,
    `${BASE}?id=${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )) as { success: boolean; data: Product }
  return response.data
}

export async function deleteProductApi(
  getToken: TokenGetter,
  id: string
): Promise<void> {
  await authorizedRequest(getToken, `${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function fetchAttributeDefinitionsApi(
  getToken: TokenGetter
): Promise<AttributeDefinition[]> {
  const response = (await authorizedRequest(getToken, ATTR_BASE)) as {
    success: boolean
    data: AttributeDefinition[]
  }
  return response.data || []
}

export async function createAttributeDefinitionApi(
  getToken: TokenGetter,
  input: AttributeDefinitionInput
): Promise<AttributeDefinition> {
  const response = (await authorizedRequest(getToken, ATTR_BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  })) as { success: boolean; data: AttributeDefinition }
  return response.data
}
