// @ts-expect-error untyped virtual module (same pattern across api routes)
import { createAPIFileRoute } from '@tanstack/react-start/api'
import prisma from '@/lib/prisma'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'
import { getTenantAuthUserIds } from '@/server/utils/tenant'

export const APIRoute = createAPIFileRoute('/api/crm/customers/segment')({
  POST: async ({ request }: { request: Request }) => {
    let authorizedUser
    try {
      const token = getBearerToken(request)
      authorizedUser = await requireAuth(token, 'sales.manage')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unauthorized'
      return jsonError(message, message.startsWith('Forbidden') ? 403 : 401)
    }

    try {
      const payload = await request.json()

      if (
        !payload.customerIds ||
        !Array.isArray(payload.customerIds) ||
        !payload.segment
      ) {
        return jsonError('Invalid payload', 400)
      }

      const { customerIds, segment } = payload

      // Only customers belonging to the caller's tenant may be re-segmented.
      const tenantAuthUserIds = await getTenantAuthUserIds(authorizedUser.userId)

      const result = await prisma.customers.updateMany({
        where: {
          customer_id: {
            in: customerIds,
          },
          auth_user_id: {
            in: tenantAuthUserIds,
          },
        },
        data: {
          crm_status: segment,
        },
      })

      return Response.json({ success: true, count: result.count })
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : 'Internal Server Error',
        500
      )
    }
  },
})
