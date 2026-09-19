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
    action?: 'block' | 'unblock'
    reason?: string
  }

  if (!body.userId) {
    return jsonError('User ID is required.', 400)
  }

  const action = body.action ?? 'block'

  // Validate tenant boundary
  const tenantUserIds = await getTenantAuthUserIds(auth.userId)
  if (!tenantUserIds.includes(body.userId)) {
    return jsonError('User does not belong to your tenant.', 403)
  }

  try {
    if (action === 'block') {
      try {
        await supabaseAdmin.auth.admin.updateUserById(body.userId, {
          ban_duration: '876000h',
        })
      } catch (e) {
        console.warn('Supabase ban warning:', e)
      }

      await prisma.tenant_users.updateMany({
        where: { auth_user_id: body.userId },
        data: {
          is_blocked: true,
          blocked_at: new Date(),
          blocked_by: auth.userId,
          is_active: false,
          updated_at: new Date(),
        },
      })

      return Response.json({
        success: true,
        message: 'User blocked successfully.',
      })
    } else {
      try {
        await supabaseAdmin.auth.admin.updateUserById(body.userId, {
          ban_duration: 'none',
        })
      } catch (e) {
        console.warn('Supabase unban warning:', e)
      }

      await prisma.tenant_users.updateMany({
        where: { auth_user_id: body.userId },
        data: {
          is_blocked: false,
          blocked_at: null,
          blocked_by: null,
          is_active: true,
          updated_at: new Date(),
        },
      })

      return Response.json({
        success: true,
        message: 'User unblocked successfully.',
      })
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Failed to update user block status',
      500
    )
  }
})

export const Route = createFileRoute('/api/users/block')({
  server: {
    handlers: {
      POST,
    },
  },
})
