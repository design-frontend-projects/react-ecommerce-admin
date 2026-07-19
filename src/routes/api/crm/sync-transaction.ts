import {
  syncTransactionToCRM,
  type SyncPayload,
} from '@/services/crm/syncManager'
// @ts-expect-error untyped virtual module (same pattern across api routes)
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export const APIRoute = createAPIFileRoute('/api/crm/sync-transaction')({
  POST: async ({ request }: { request: Request }) => {
    try {
      const token = getBearerToken(request)
      await requireAuth(token, 'pos.access')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized'
      return jsonError(message, message.startsWith('Forbidden') ? 403 : 401)
    }

    try {
      const payload: SyncPayload = await request.json()

      // Basic validation
      if (!payload.orderId || !payload.customer || !payload.transactionAmount) {
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
  },
})
