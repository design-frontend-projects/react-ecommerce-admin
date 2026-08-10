import { createFileRoute } from '@tanstack/react-router'
import { createOnboardingUsers } from '@/server/fns/onboarding-users'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'

const POST = withAuth(null, async ({ request, auth }) => {
  const body = (await request.json()) as {
    users?: Array<{
      email?: string
      firstName?: string
      lastName?: string
      phone?: string
      roleId?: string
      branchId?: string
    }>
  }

  if (!body.users || !Array.isArray(body.users) || body.users.length === 0) {
    return jsonError('At least one user is required.', 400)
  }

  // Validate each user has required fields
  for (const user of body.users) {
    if (!user.email?.trim()) {
      return jsonError('Each user must have an email.', 400)
    }
    if (!user.roleId?.trim()) {
      return jsonError('Each user must have a role.', 400)
    }
  }

  try {
    const result = await createOnboardingUsers(
      {
        users: body.users.map((u) => ({
          email: u.email!.trim(),
          firstName: u.firstName?.trim(),
          lastName: u.lastName?.trim(),
          phone: u.phone?.trim(),
          roleId: u.roleId!.trim(),
          branchId: u.branchId?.trim(),
        })),
      },
      { authUserId: auth.userId }
    )

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to create users.',
      400
    )
  }
})

export const Route = createFileRoute('/api/onboarding/users')({
  server: {
    handlers: {
      POST,
    },
  },
})
