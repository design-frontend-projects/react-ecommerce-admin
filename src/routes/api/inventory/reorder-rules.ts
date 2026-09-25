import { createFileRoute } from '@tanstack/react-router'
import {
  createRule,
  deleteRule,
  listRules,
  updateRule,
  type CreateRuleInput,
  type UpdateRuleInput,
} from '@/server/fns/reorder-rules'
import { reorderRulesQuerySchema } from '@/features/reorder-rules/data/schema'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const GET = withAuth(PERMISSIONS.INVENTORY_VIEW, async ({ request, auth }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const rawQuery = {
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      storeId: searchParams.get('storeId') ?? undefined,
      isActive: searchParams.get('isActive') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    }
    const query = reorderRulesQuerySchema.parse(rawQuery)
    const data = await listRules(userId, query)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch reorder rules')
  }
})

const POST = withAuth(
  PERMISSIONS.INVENTORY_MANAGE,
  async ({ request, auth }) => {
    try {
      const { userId } = auth
      const body = (await request.json()) as CreateRuleInput
      const data = await createRule(userId, body)
      return Response.json({ success: true, data })
    } catch (error) {
      return handleRouteError(error, 'Unable to create reorder rule')
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
)

export const Route = createFileRoute('/api/inventory/reorder-rules')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
