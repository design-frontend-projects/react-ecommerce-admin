import { createFileRoute } from '@tanstack/react-router'
import { jsonError } from '@/server/utils/http'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

export const Route = createFileRoute('/api/crm/customers/segment')({
  server: {
    handlers: {
      POST: withAuth(PERMISSIONS.SALES_MANAGE, async ({ request, auth }) => {
        try {
          const payload = await request.json()

          if (
            !payload.customerIds ||
            !Array.isArray(payload.customerIds) ||
            !payload.groupId
          ) {
            return jsonError('Invalid payload', 400)
          }

          const { customerIds, groupId } = payload
          const tenantId = await requireTenantId(auth.userId)
          const tenantUserId = await resolveTenantUserId(auth.userId)

          const result = await prisma.customers.updateMany({
            where: {
              id: {
                in: customerIds,
              },
              tenant_id: tenantId,
            },
            data: {
              group_id: groupId,
              updated_by_user_id: tenantUserId,
            },
          })

          return Response.json({ success: true, count: result.count })
        } catch (error) {
          return jsonError(
            error instanceof Error ? error.message : 'Internal Server Error',
            500
          )
        }
      }),
    },
  },
})
