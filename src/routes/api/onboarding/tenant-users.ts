import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/lib/prisma'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'

const GET = withAuth(null, async ({ auth, getTenantId }) => {
  try {
    const tenantId = await getTenantId()

    const tenantUsers = (await prisma.tenant_users.findMany({
      where: tenantId
        ? {
            OR: [
              { parent_tenant_id: tenantId },
              { tenant_id: tenantId },
            ],
            auth_user_id: { not: auth.userId },
          }
        : {
            auth_user_id: { not: auth.userId },
          },
      include: {
        branches: {
          select: { id: true, name: true },
        },
        user_roles: {
          include: {
            roles: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })) as Array<{
      id: string
      auth_user_id: string | null
      email: string | null
      first_name: string | null
      last_name: string | null
      phone: string | null
      branch_id: string | null
      default_role: string | null
      parent_tenant_id: string | null
      created_at: Date | null
      branches: { id: string; name: string } | null
      user_roles: Array<{
        roles: { id: string; name: string }
      }>
    }>

    const users = tenantUsers.map((tu) => {
      const roleNames = tu.user_roles.map((ur) => ur.roles.name)
      const roleIds = tu.user_roles.map((ur) => ur.roles.id)

      return {
        id: tu.id,
        authUserId: tu.auth_user_id ?? '',
        email: tu.email ?? '',
        firstName: tu.first_name,
        lastName: tu.last_name,
        phone: tu.phone,
        role: roleNames[0] ?? tu.default_role ?? null,
        roleNames,
        roleIds,
        branchId: tu.branch_id,
        branchName: tu.branches?.name ?? null,
        isUser: true,
        isPaid: false,
        isOwner: false,
        parentAuthUserId: tu.parent_tenant_id,
        createdAt: tu.created_at?.toISOString() ?? null,
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
