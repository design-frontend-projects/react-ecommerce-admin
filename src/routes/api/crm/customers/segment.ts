import { createFileRoute } from '@tanstack/react-router'
import { jsonError } from '@/server/utils/http'
import { getTenantAuthUserIds } from '@/server/utils/tenant'
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
            !payload.segment
          ) {
            return jsonError('Invalid payload', 400)
          }

          const { customerIds, segment } = payload

          // Only customers belonging to the caller's tenant may be re-segmented.
          const tenantAuthUserIds = await getTenantAuthUserIds(auth.userId)

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
      }),
    },
  },
})
