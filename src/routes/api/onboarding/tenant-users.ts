import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/lib/prisma'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'

const GET = withAuth(null, async ({ auth }) => {
  try {
    // Fetch all profiles where parent_auth_user_id matches the logged-in tenant owner
    const tenantProfiles = (await prisma.profiles.findMany({
      where: {
        parent_auth_user_id: auth.userId,
        is_user: true,
      },
      include: {
        branches: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })) as Array<{
      id: string
      auth_user_id: string
      email: string | null
      first_name: string | null
      last_name: string | null
      phone: string | null
      role: string | null
      branch_id: string | null
      is_user: boolean
      is_paid: boolean
      is_owner: boolean
      parent_auth_user_id: string
      created_at: Date | null
      branches: { id: string; name: string } | null
    }>

    // Also fetch tenant_users info for role details
    const authUserIds = tenantProfiles.map((p) => p.auth_user_id)
    const tenantUsers = (await prisma.tenant_users.findMany({
      where: { auth_user_id: { in: authUserIds } },
      include: {
        user_roles: {
          include: {
            roles: { select: { id: true, name: true } },
          },
        },
      },
    })) as Array<{
      id: string
      auth_user_id: string
      default_role: string | null
      user_roles: Array<{
        roles: { id: string; name: string }
      }>
    }>

    const tenantUserMap = new Map(
      tenantUsers.map((tu) => [tu.auth_user_id, tu])
    )

    const users = tenantProfiles.map((profile) => {
      const tenantUser = tenantUserMap.get(profile.auth_user_id)
      const roleNames =
        tenantUser?.user_roles.map((ur) => ur.roles.name) ?? []
      const roleIds =
        tenantUser?.user_roles.map((ur) => ur.roles.id) ?? []

      return {
        id: profile.id,
        authUserId: profile.auth_user_id,
        email: profile.email ?? '',
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        role: profile.role ?? tenantUser?.default_role ?? null,
        roleNames,
        roleIds,
        branchId: profile.branch_id,
        branchName: profile.branches?.name ?? null,
        isUser: profile.is_user,
        isPaid: profile.is_paid,
        isOwner: profile.is_owner,
        parentAuthUserId: profile.parent_auth_user_id,
        createdAt: profile.created_at?.toISOString() ?? null,
      }
    })

    return Response.json({
      success: true,
      data: users,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to fetch tenant users.',
      500
    )
  }
})

export const Route = createFileRoute('/api/onboarding/tenant-users')({
  server: {
    handlers: {
      GET,
    },
  },
})
