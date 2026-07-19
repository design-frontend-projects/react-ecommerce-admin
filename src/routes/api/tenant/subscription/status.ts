import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import prisma from '@/lib/prisma'

const GET = withAuth(null, async ({ auth }) => {
  const subscription = await prisma.tenant_subscriptions.findFirst({
    where: { auth_user_id: auth.userId },
    orderBy: { created_at: 'desc' },
  })

  if (!subscription) {
    return jsonError(
      'No tenant subscription record found for authenticated user',
      404
    )
  }

  const now = new Date()
  const is_active =
    subscription.status === 'paid' &&
    (!subscription.end_date || subscription.end_date > now)

  return Response.json({
    tenant_id: subscription.id,
    status: subscription.status,
    end_date: subscription.end_date,
    is_active,
    first_use: subscription.first_use,
  })
})

export const APIRoute = createAPIFileRoute('/api/tenant/subscription/status')({
  GET,
})
