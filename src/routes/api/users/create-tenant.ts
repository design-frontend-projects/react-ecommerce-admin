import { createFileRoute } from '@tanstack/react-router'
import { createTenant } from '@/server/fns/create-tenant'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const POST = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request, auth }) => {
  const body = (await request.json()) as {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
  }

  if (!body.email) {
    return jsonError('Email is required.', 400)
  }

  try {
    const result = await createTenant(
      {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
      },
      { authUserId: auth.userId }
    )

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to create tenant',
      400
    )
  }
})

export const Route = createFileRoute('/api/users/create-tenant')({
  server: {
    handlers: {
      POST,
    },
  },
})
