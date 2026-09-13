import { createFileRoute } from '@tanstack/react-router'
import {
  assignStoreWarehouse,
  listStoreWarehouses,
  listWarehouseStores,
  removeStoreWarehouse,
  reorderStoreWarehouses,
  updateStoreWarehouse,
  type StoreWarehouseInput,
  type StoreWarehouseUpdateInput,
} from '@/server/fns/store-warehouses'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(
  [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
  ],
  async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const warehouseId = searchParams.get('warehouseId')

    if (storeId) {
      const data = await listStoreWarehouses(userId, storeId)
      return Response.json({ success: true, data })
    }

    if (warehouseId) {
      const data = await listWarehouseStores(userId, warehouseId)
      return Response.json({ success: true, data })
    }

    return Response.json(
      {
        success: false,
        error: { message: 'Either storeId or warehouseId query parameter is required.' },
      },
      { status: 400 }
    )
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch store warehouses')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as StoreWarehouseInput & {
        action?: 'reorder'
        orderedIds?: string[]
      }

      if (body.action === 'reorder' && body.storeId && Array.isArray(body.orderedIds)) {
        const data = await reorderStoreWarehouses(userId, body.storeId, body.orderedIds)
        return Response.json({ success: true, data })
      }

      const data = await assignStoreWarehouse(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to assign warehouse to store')
    }
  }
)

const PATCH = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Link id is required.' } },
          { status: 400 }
        )
      }

      const body = (await request.json()) as StoreWarehouseUpdateInput
      const data = await updateStoreWarehouse(userId, id, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update store-warehouse link')
    }
  }
)

const DELETE = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Link id is required.' } },
          { status: 400 }
        )
      }

      const data = await removeStoreWarehouse(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to remove store-warehouse link')
    }
  }
)

export const Route = createFileRoute('/api/inventory/store-warehouses')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
