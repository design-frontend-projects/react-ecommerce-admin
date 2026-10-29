import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/lib/prisma'
import { calculateEndDate } from '@/lib/subscription_utils'
import { jsonError } from '@/server/utils/http'
import { isValidUuid } from '@/server/utils/tenant'
import { withAuth } from '@/server/utils/with-auth'
import { serializeTenantSubscription } from './overview'

const subscribeInputSchema = z.object({
  subscription_id: z.string().min(1, 'Subscription plan ID is required'),
  payment_method: z.string().optional().default('card'),
  transfer_ref: z.string().optional().nullable(),
  auto_renew: z.boolean().optional().default(true),
})

const POST = withAuth(null, async ({ request, auth, getTenantId }) => {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return jsonError('Invalid JSON request body', 400)
  }

  const parsed = subscribeInputSchema.safeParse(rawBody)
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? 'Invalid subscription payload',
      400
    )
  }

  const { subscription_id, payment_method, transfer_ref, auto_renew } =
    parsed.data

  // Resolve target platform plan
  let plan = null
  if (isValidUuid(subscription_id)) {
    plan = await prisma.subscriptions.findUnique({
      where: { id: subscription_id },
    })
  }

  if (!plan) {
    plan = await prisma.subscriptions.findFirst({
      where: {
        OR: [
          { code: { equals: subscription_id, mode: 'insensitive' } },
          { name: { equals: subscription_id, mode: 'insensitive' } },
        ],
      },
    })
  }

  if (!plan) {
    return jsonError('Selected subscription plan was not found.', 404)
  }

  if (!plan.is_active) {
    return jsonError(
      'Selected subscription plan is no longer active.',
      422
    )
  }

  const resolvedTenantId = await getTenantId()

  let tenantRecord = null
  if (resolvedTenantId && isValidUuid(resolvedTenantId)) {
    tenantRecord = await prisma.tenants
      .findUnique({
        where: { id: resolvedTenantId },
        select: { id: true },
      })
      .catch(() => null)
  }

  if (!tenantRecord && isValidUuid(auth.userId)) {
    tenantRecord = await prisma.tenants
      .findFirst({
        where: { auth_user_id: auth.userId },
        select: { id: true },
      })
      .catch(() => null)
  }

  const effectiveTenantId = tenantRecord?.id ?? null

  const callerProfile = isValidUuid(auth.userId)
    ? await prisma.tenant_users
        .findFirst({
          where: { auth_user_id: auth.userId },
          select: {
            email: true,
            first_name: true,
            last_name: true,
          },
        })
        .catch(() => null)
    : null

  const email = callerProfile?.email || auth.email || 'tenant@platform.local'
  const now = new Date()
  const durationMonths = Math.max(1, Number(plan.duration_months || 1))
  const startDate = now
  const endDate = calculateEndDate(startDate, durationMonths)

  const trialDays = Number(plan.trial_period_days ?? 0)
  const trialEndsAt =
    trialDays > 0
      ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
      : null

  const graceDays = Number(plan.grace_period_days ?? 7)
  const graceEndsAt =
    graceDays > 0
      ? new Date(endDate.getTime() + graceDays * 24 * 60 * 60 * 1000)
      : null

  const subMatchOr: Array<Record<string, unknown>> = []
  if (effectiveTenantId && isValidUuid(effectiveTenantId)) {
    subMatchOr.push({ tenant_id: effectiveTenantId })
  }
  if (isValidUuid(auth.userId)) {
    subMatchOr.push({ auth_user_id: auth.userId })
  }

  const result = await prisma.$transaction(async (tx) => {
    let supersededCount = 0

    // 1. Enforce ONLY ONE active subscription: cancel all existing active/paid/trial/new/grace_period rows
    if (subMatchOr.length > 0) {
      const updateRes = await tx.tenant_subscriptions.updateMany({
        where: {
          OR: subMatchOr,
          status: {
            in: ['paid', 'active', 'trial', 'new', 'grace_period'],
          },
        },
        data: {
          status: 'canceled',
          cancelled_at: now,
          updated_at: now,
        },
      })
      supersededCount = updateRes.count
    }

    // 2. Create the single active subscription record
    const createdSub = await tx.tenant_subscriptions.create({
      data: {
        tenant_id: effectiveTenantId,
        auth_user_id: auth.userId,
        email,
        first_name: callerProfile?.first_name ?? null,
        last_name: callerProfile?.last_name ?? null,
        is_owner: true,
        subscription_id: plan.id,
        status: 'paid',
        first_use: false,
        start_date: startDate,
        end_date: endDate,
        trial_ends_at: trialEndsAt,
        grace_ends_at: graceEndsAt,
        auto_renew,
        price_at_purchase: plan.price,
        currency: String(plan.currency ?? 'LE').slice(0, 3),
        payment_method: payment_method || 'card',
        transfer_ref: transfer_ref || null,
      },
      include: {
        subscriptions: true,
      },
    })

    // 3. Point tenant's current_subscription_id to the new active subscription
    if (effectiveTenantId) {
      await tx.tenants.update({
        where: { id: effectiveTenantId },
        data: {
          current_subscription_id: createdSub.id,
          updated_at: now,
        },
      })
    }

    return {
      createdSub,
      supersededCount,
    }
  })

  return Response.json({
    success: true,
    data: {
      subscription: serializeTenantSubscription(result.createdSub),
      supersededCount: result.supersededCount,
    },
  })
})

export const Route = createFileRoute('/api/tenant/subscription/subscribe')({
  server: {
    handlers: {
      POST,
    },
  },
})

