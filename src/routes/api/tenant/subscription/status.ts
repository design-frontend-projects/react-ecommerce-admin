import { createFileRoute } from '@tanstack/react-router'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'

const GET = withAuth(null, async ({ auth }) => {
  const subscription = await prisma.tenant_subscriptions.findFirst({
    where: { auth_user_id: auth.userId },
    orderBy: { created_at: 'desc' },
  })

  if (!subscription) {
    return Response.json({
      tenant_id: null,
      status: 'none',
      end_date: null,
      is_active: false,
      first_use: true,
    })
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

export const Route = createFileRoute('/api/tenant/subscription/status')({
  server: {
    handlers: {
      GET,
    },
  },
})
