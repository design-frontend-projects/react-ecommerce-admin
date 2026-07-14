import {
  approveRequisition,
  convertRequisition,
  rejectRequisition,
  submitRequisition,
} from '@/server/fns/purchase-requisitions'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const ACTIONS = {
  submit: submitRequisition,
  approve: approveRequisition,
  reject: rejectRequisition,
  convert: convertRequisition,
} as const

type RequisitionAction = keyof typeof ACTIONS

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'purchasing.manage')

    const body = (await request.json()) as {
      id?: string
      action?: RequisitionAction
    }
    if (!body.id) {
      return Response.json(
        { success: false, error: { message: 'Requisition id is required.' } },
        { status: 400 }
      )
    }
    if (!body.action || !(body.action in ACTIONS)) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Action must be one of: submit, approve, reject, convert.',
          },
        },
        { status: 400 }
      )
    }
    const data = await ACTIONS[body.action](userId, body.id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update requisition')
  }
}

export const APIRoute = createAPIFileRoute(
  '/api/inventory/purchase-requisitions/actions'
)({
  POST,
})
