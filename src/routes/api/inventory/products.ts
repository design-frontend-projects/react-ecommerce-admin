import { createFileRoute } from '@tanstack/react-router'
import {
  createProductMaster,
  deleteProductMaster,
  getProduct,
  getProductStats,
  listProducts,
  updateProductMaster,
  type CreateProductMasterInput,
  type ProductQueryParams,
  type UpdateProductMasterInput,
} from '@/server/fns/products'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { hasPermission } from '@/features/users/data/rbac'

const GET = withAuth(
  [
    PERMISSIONS.PRODUCTS_VIEW,
    'products.view' as any,
    'general.products.view' as any,
  ],
  async ({ request, auth }) => {
    try {
      const { userId, permissionNames } = auth
      const url = new URL(request.url)
      const id = url.searchParams.get('id')

      if (id) {
        const data = await getProduct(userId, id, { permissions: permissionNames })
        return Response.json({ success: true, data })
      }

      if (url.searchParams.get('stats') === 'true') {
        const data = await getProductStats(userId)
        return Response.json({ success: true, data })
      }

      if (url.searchParams.get('export') === 'true') {
        const hasExportPerm =
          hasPermission(permissionNames, 'products.export') ||
          hasPermission(permissionNames, '*')
        if (!hasExportPerm) {
          return Response.json(
            { success: false, error: { message: "Forbidden: Missing required permission 'products.export'" } },
            { status: 403 }
          )
        }
      }

      const queryParams: ProductQueryParams = {
        page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined,
        pageSize: url.searchParams.get('pageSize')
          ? Number(url.searchParams.get('pageSize'))
          : undefined,
        search: url.searchParams.get('search') || undefined,
        categoryId: url.searchParams.getAll('categoryId').length > 0
          ? url.searchParams.getAll('categoryId')
          : url.searchParams.get('categoryId') || undefined,
        brandId: url.searchParams.getAll('brandId').length > 0
          ? url.searchParams.getAll('brandId')
          : url.searchParams.get('brandId') || undefined,
        baseUomId: url.searchParams.getAll('baseUomId').length > 0
          ? url.searchParams.getAll('baseUomId')
          : url.searchParams.get('baseUomId') || undefined,
        supplierId: url.searchParams.getAll('supplierId').length > 0
          ? url.searchParams.getAll('supplierId')
          : url.searchParams.get('supplierId') || undefined,
        productType: url.searchParams.getAll('productType').length > 0
          ? url.searchParams.getAll('productType')
          : url.searchParams.get('productType') || undefined,
        quickFilter: url.searchParams.get('quickFilter') || undefined,
        isActive:
          url.searchParams.get('isActive') !== null
            ? url.searchParams.get('isActive') === 'true'
            : undefined,
        sortBy: url.searchParams.get('sortBy') || undefined,
        sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      }

      const data = await listProducts(userId, queryParams, { permissions: permissionNames })
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to fetch products')
    }
  }
)

const POST = withAuth(
  [
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_MANAGE,
    'products.create' as any,
    'general.products.manage' as any,
  ],
  async ({ request, auth }) => {
    try {
      const { userId, permissionNames } = auth
      const body = (await request.json()) as CreateProductMasterInput
      const data = await createProductMaster(userId, body, { permissions: permissionNames })
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create product')
    }
  }
)

const PATCH = withAuth(
  [
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_MANAGE,
    'products.update' as any,
    'general.products.manage' as any,
  ],
  async ({ request, auth }) => {
    try {
      const { userId, permissionNames } = auth
      const url = new URL(request.url)
      const id = url.searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Product id is required.' } },
          { status: 400 }
        )
      }
      const body = (await request.json()) as UpdateProductMasterInput
      const data = await updateProductMaster(userId, id, body, { permissions: permissionNames })
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update product')
    }
  }
)

const DELETE = withAuth(
  [
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.PRODUCTS_MANAGE,
    'products.delete' as any,
    'general.products.manage' as any,
  ],
  async ({ request, auth }) => {
    try {
      const { userId, permissionNames } = auth
      const url = new URL(request.url)
      const id = url.searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Product id is required.' } },
          { status: 400 }
        )
      }
      const data = await deleteProductMaster(userId, id, { permissions: permissionNames })
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to delete product')
    }
  }
)

export const Route = createFileRoute('/api/inventory/products')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
