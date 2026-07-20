import { createFileRoute } from '@tanstack/react-router'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const MAX_PAGE_SIZE = 100

/**
 * Tenant-scoped RBAC audit trail. Regular admins see their tenant's rows
 * (plus legacy rows with no tenant stamp when they match no other tenant is
 * NOT possible to distinguish — legacy rows are visible to system owners
 * only). System owners see everything.
 */
const GET = withAuth(
  PERMISSIONS.AUDIT_VIEW,
  async ({ request, auth, getTenantId }) => {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit') ?? '25') || 25, 1),
      MAX_PAGE_SIZE
    )
    const offset = Math.max(Number(searchParams.get('offset') ?? '0') || 0, 0)
    const targetType = searchParams.get('targetType') ?? undefined

    const ownerProfile = (await prisma.profiles.findFirst({
      where: { auth_user_id: auth.userId },
      select: { system_owner: true },
    })) as { system_owner: boolean | null } | null
    const isSystemOwner = ownerProfile?.system_owner === true

    const tenantId = isSystemOwner ? null : await getTenantId()
    if (!isSystemOwner && !tenantId) {
      return Response.json({
        success: true,
        data: { entries: [], total: 0, limit, offset },
      })
    }

    const where = {
      ...(isSystemOwner ? {} : { tenant_id: tenantId }),
      ...(targetType ? { target_type: targetType } : {}),
    }

    const [entries, total] = await Promise.all([
      prisma.rbac_audit.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.rbac_audit.count({ where }),
    ])

    return Response.json({
      success: true,
      data: { entries, total, limit, offset },
    })
  }
)

export const Route = createFileRoute('/api/rbac/audit')({
  server: {
    handlers: {
      GET,
    },
  },
})
