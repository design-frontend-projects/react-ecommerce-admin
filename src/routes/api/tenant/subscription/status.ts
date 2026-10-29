import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/lib/prisma'
import { isActiveSubscriptionStatus } from '@/lib/subscription_utils'
import { isValidUuid } from '@/server/utils/tenant'
import { withAuth } from '@/server/utils/with-auth'
import { serializeTenantSubscription } from './overview'

const GET = withAuth(null, async ({ auth, getTenantId }) => {
  try {
    const resolvedTenantId = await getTenantId()
    const whereOr: Array<Record<string, unknown>> = []
    if (resolvedTenantId && isValidUuid(resolvedTenantId)) {
      whereOr.push({ tenant_id: resolvedTenantId })
    }
    if (isValidUuid(auth.userId)) {
      whereOr.push({ auth_user_id: auth.userId })
    }

    let subscription = await prisma.tenant_subscriptions.findFirst({
      where: {
        OR: whereOr,
        status: {
          in: ['paid', 'active', 'trial', 'grace_period'],
        },
      },
      include: { subscriptions: true },
      orderBy: { created_at: 'desc' },
    })

    if (!subscription) {
      subscription = await prisma.tenant_subscriptions.findFirst({
        where: { OR: whereOr },
        include: { subscriptions: true },
        orderBy: { created_at: 'desc' },
      })
    }

    if (!subscription) {
      return Response.json({
        tenant_id: resolvedTenantId,
        status: 'none',
        end_date: null,
        is_active: false,
        first_use: true,
        subscription: null,
      })
    }

    const now = new Date()
    const is_active =
      isActiveSubscriptionStatus(subscription.status) &&
      (!subscription.end_date || subscription.end_date > now)

    return Response.json({
      tenant_id: subscription.tenant_id ?? subscription.id,
      status: subscription.status,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      is_active,
      first_use: subscription.first_use,
      subscription: serializeTenantSubscription(subscription),
    })
  } catch {
    return Response.json({
      tenant_id: null,
      status: 'none',
      end_date: null,
      is_active: false,
      first_use: true,
      subscription: null,
    })
  }
})

export const Route = createFileRoute('/api/tenant/subscription/status')({
  server: {
    handlers: {
      GET,
    },
  },
})
