// @ts-ignore
import {
  syncTransactionToCRM,
  type SyncPayload,
} from '@/services/crm/syncManager'
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/crm/sync-transaction')({
  POST: async ({ request }: { request: Request }) => {
    try {
      const payload: SyncPayload = await request.json()

      // Basic validation
      if (!payload.orderId || !payload.customer || !payload.transactionAmount) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const result = await syncTransactionToCRM(payload)

      return new Response(JSON.stringify({ success: true, data: result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error: any) {
      console.error('CRM Sync Error:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  },
})
