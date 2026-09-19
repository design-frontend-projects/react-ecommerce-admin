import { createFileRoute } from '@tanstack/react-router'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase-admin'
import { getTenantAuthUserIds } from '@/server/utils/tenant'

const POST = withAuth(PERMISSIONS.USERS_MANAGE, async ({ request, auth }) => {
  const body = (await request.json()) as {
    userId?: string
  }

  if (!body.userId) {
    return jsonError('User ID is required.', 400)
  }

  if (body.userId === auth.userId) {
    return jsonError('You cannot delete your own account.', 400)
  }

  const tenantUserIds = await getTenantAuthUserIds(auth.userId)
  if (!tenantUserIds.includes(body.userId)) {
    return jsonError('User does not belong to your tenant.', 403)
  }

  try {
    await prisma.tenant_users.updateMany({
      where: { auth_user_id: body.userId },
      data: {
        is_active: false,
        deleted_at: new Date(),
        deleted_by: auth.userId,
        updated_at: new Date(),
      },
    })

    try {
      await supabaseAdmin.auth.admin.deleteUser(body.userId)
    } catch (e) {
      console.warn('Supabase deleteUser warning:', e)
    }

    return Response.json({
      success: true,
      message: 'User deleted successfully.',
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Failed to delete user',
      500
    )
  }
})

export const Route = createFileRoute('/api/users/delete')({
  server: {
    handlers: {
      POST,
    },
  },
})
