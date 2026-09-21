import { createFileRoute } from '@tanstack/react-router'
import {
  createBatch,
  deleteBatch,
  listBatches,
  setBatchStatus,
  updateBatch,
  type BatchToggleStatus,
  type CreateBatchInput,
  type UpdateBatchInput,
} from '@/server/fns/batches'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ auth }) => {
  try {
    const { userId } = auth
    const data = await listBatches(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch batches')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as Record<string, unknown>

      // Check if this is a status toggle action
      if (body.action === 'status' || (body.id && body.status && !body.product_variant_id)) {
        const id = body.id as string
        const status = body.status as BatchToggleStatus
        if (!id) {
          return Response.json(
            { success: false, error: { message: 'Batch id is required.' } },
            { status: 400 }
          )
        }
        if (!status) {
          return Response.json(
            { success: false, error: { message: 'Batch status is required.' } },
            { status: 400 }
          )
        }
        const data = await setBatchStatus(userId, id, status)
        return Response.json({ success: true, data })
      }

      // Otherwise, create batch
      const input = body as unknown as CreateBatchInput
      const data = await createBatch(userId, input)
      return Response.json({ success: true, data }, { status: 201 })
    } catch (error) {
      return handleRouteError(error, 'Unable to process batch request')
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
          { success: false, error: { message: 'Batch id is required.' } },
          { status: 400 }
        )
      }
      const body = (await request.json()) as UpdateBatchInput
      const data = await updateBatch(userId, id, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to update batch')
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
          { success: false, error: { message: 'Batch id is required.' } },
          { status: 400 }
        )
      }
      const data = await deleteBatch(userId, id)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to delete batch')
    }
  }
)

export const Route = createFileRoute('/api/inventory/batches')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
