import { createFileRoute } from '@tanstack/react-router'
import {
  completeTenantOnboarding,
  type CompleteTenantOnboardingInput,
} from '@/server/fns/complete-onboarding'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'

const POST = withAuth(null, async ({ request, auth }) => {
  const body = (await request.json()) as Partial<CompleteTenantOnboardingInput>

  if (!body.authUserId || auth.userId !== body.authUserId) {
    return jsonError('You can only complete onboarding for your own signed-in account.', 403)
  }

  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return jsonError('First name and last name are required.', 400)
  }

  if (!body.businessName?.trim()) {
    return jsonError('Business name is required.', 400)
  }

  if (!body.countryId?.trim()) {
    return jsonError('Country selection is required.', 400)
  }

  if (!body.activity?.trim()) {
    return jsonError('Business activity selection is required.', 400)
  }

  if (!body.paymentMethod?.trim()) {
    return jsonError('Payment method selection is required.', 400)
  }

  if (!body.subscriptionId?.trim()) {
    return jsonError('Subscription plan selection is required.', 400)
  }

  try {
    const result = await completeTenantOnboarding({
      data: {
        authUserId: body.authUserId,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        phone: body.phone?.trim(),
        businessName: body.businessName.trim(),
        displayName: body.displayName?.trim(),
        legalName: body.legalName?.trim(),
        countryId: body.countryId.trim(),
        activity: body.activity.trim(),
        paymentMethod: body.paymentMethod.trim(),
        transferRef: body.transferRef?.trim(),
        subscriptionId: body.subscriptionId.trim(),
      }
    })

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to complete tenant onboarding.',
      500
    )
  }
})

export const Route = createFileRoute('/api/onboarding/complete')({
  server: {
    handlers: {
      POST,
    },
  },
})
