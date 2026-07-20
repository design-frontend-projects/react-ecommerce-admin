import { createFileRoute } from '@tanstack/react-router'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import {
  syncTransactionToCRM,
  type SyncPayload,
} from '@/services/crm/syncManager'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

export const Route = createFileRoute('/api/crm/sync-transaction')({
  server: {
    handlers: {
      POST: withAuth(PERMISSIONS.POS_ACCESS, async ({ request }) => {
        try {
          const payload: SyncPayload = await request.json()

          // Basic validation
          if (
            !payload.orderId ||
            !payload.customer ||
            !payload.transactionAmount
          ) {
            return jsonError('Invalid payload', 400)
          }

          const result = await syncTransactionToCRM(payload)

          return Response.json({ success: true, data: result })
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
