import { createFileRoute } from '@tanstack/react-router'
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from '@/server/fns/suppliers'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.PURCHASING_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listSuppliers(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch suppliers')
  }
})

const POST = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as CreateSupplierInput
      const data = await createSupplier(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create supplier')
    }
  }
)

const PATCH = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Supplier id is required.' } },
          { status: 400 }
        )
      }
      const body = (await request.json()) as UpdateSupplierInput
      const data = await updateSupplier(userId, id, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update supplier')
    }
  }
)

const DELETE = withAuth(
  PERMISSIONS.PURCHASING_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (!id) {
        return Response.json(
          { success: false, error: { message: 'Supplier id is required.' } },
          { status: 400 }
        )
      }
      const data = await deleteSupplier(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to delete supplier')
    }
  }
)

export const Route = createFileRoute('/api/inventory/suppliers')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
