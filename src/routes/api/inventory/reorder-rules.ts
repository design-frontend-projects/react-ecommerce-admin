import { createAPIFileRoute } from '@tanstack/react-start/api'

import {
  createRule,
  deleteRule,
  listRules,
  updateRule,
  type CreateRuleInput,
  type UpdateRuleInput,
} from '@/server/fns/reorder-rules'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')
    const data = await listRules(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch reorder rules')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const body = (await request.json()) as CreateRuleInput
    const data = await createRule(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create reorder rule')
  }
}

const PATCH = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Rule id is required.' } },
        { status: 400 }
      )
    }
    const body = (await request.json()) as UpdateRuleInput
    const data = await updateRule(userId, id, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update reorder rule')
  }
}

const DELETE = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Rule id is required.' } },
        { status: 400 }
      )
    }
    const data = await deleteRule(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete reorder rule')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/reorder-rules')({
  GET,
  POST,
  PATCH,
  DELETE,
})
