import { createFileRoute } from '@tanstack/react-router'
import { provisionSignupUser } from '@/server/fns/provision-signup-user'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { supabaseAdmin } from '@/server/supabase-admin'

const POST = withAuth(null, async ({ request, auth }) => {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
  }

  let email = body.email?.trim().toLowerCase()
  let firstName = body.firstName?.trim()
  let lastName = body.lastName?.trim()

  if (!email) {
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(auth.userId)
    if (userError || !userData.user?.email) {
      return jsonError('Unable to resolve user email', 400)
    }
    email = userData.user.email.toLowerCase()
    firstName = firstName || userData.user.user_metadata?.firstName
    lastName = lastName || userData.user.user_metadata?.lastName
  }

  try {
    const result = await provisionSignupUser({
      authUserId: auth.userId,
      email,
      firstName,
      lastName,
      phone: body.phone?.trim(),
    })

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Failed to provision tenant user.',
      500
    )
  }
})

export const Route = createFileRoute('/api/auth/provision-signup')({
  server: {
    handlers: {
      POST,
    },
  },
})
