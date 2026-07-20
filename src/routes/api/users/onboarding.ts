import { createFileRoute } from '@tanstack/react-router'
import { completeOnboarding } from '@/server/fns/auth'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'

const POST = withAuth(null, async ({ request, auth }) => {
  const body = (await request.json()) as {
    authUserId?: string
    firstName?: string
    lastName?: string
    phone?: string
  }

  if (!body.authUserId || !body.firstName || !body.lastName) {
    return jsonError('authUserId, firstName, and lastName are required.', 400)
  }

  if (auth.userId !== body.authUserId) {
    return jsonError(
      'You can only complete onboarding for the signed-in user.',
      403
    )
  }

  const result = await completeOnboarding({
    authUserId: body.authUserId,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
  } as any)

  return Response.json({
    success: true,
    data: result,
  })
})

export const Route = createFileRoute('/api/users/onboarding')({
  server: {
    handlers: {
      POST,
    },
  },
})
