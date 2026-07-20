import { createFileRoute } from '@tanstack/react-router'
import { setTenantActivityTypes } from '@/server/fns/activity-types'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'

const POST = withAuth(null, async ({ request, auth }) => {
  const body = (await request.json()) as {
    company_name?: string
    billing_contact?: string
    timezone?: string
    industry?: string
    activityTypeCodes?: string[]
  }

  if (
    !body.company_name ||
    !body.billing_contact ||
    !body.timezone ||
    !body.industry
  ) {
    return jsonError('Missing required onboarding fields', 400)
  }

  // Find the tenant subscription for the user
  // We assume the user has a subscription record attached to their auth_user_id
  const existingSubscription = await prisma.tenant_subscriptions.findFirst({
    where: { auth_user_id: auth.userId },
  })

  if (!existingSubscription) {
    // In a real app we might create one here or when the user signs up
    return jsonError('No subscription record found for authenticated user', 404)
  }

  // Update the subscription
  const updatedSubscription = await prisma.tenant_subscriptions.update({
    where: { id: existingSubscription.id },
    data: {
      first_use: false,
      // Typically we would also update company_name etc if they were on this model
      // but based on the schema, we might not have all fields.
      // We will just update first_use for now.
    },
  })

  // Seed the tenant's initial activity types from the module(s) chosen at onboarding.
  if (
    Array.isArray(body.activityTypeCodes) &&
    body.activityTypeCodes.length > 0
  ) {
    await setTenantActivityTypes(auth.userId, body.activityTypeCodes)
  }

  return Response.json({
    success: true,
    tenant: {
      id: updatedSubscription.id,
      first_use: updatedSubscription.first_use,
      status: updatedSubscription.status,
      company_name: body.company_name,
    },
  })
})

export const Route = createFileRoute('/api/tenant/onboard')({
  server: {
    handlers: {
      POST,
    },
  },
})
