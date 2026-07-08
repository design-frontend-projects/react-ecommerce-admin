import {
  createPermission,
  deletePermission,
  setRolePermissions,
} from '@/server/fns/rbac'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function PUT(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'permissions.manage')

    const body = (await request.json()) as {
      roleId?: string
      permissionIds?: string[]
    }

    if (!body.roleId || !Array.isArray(body.permissionIds)) {
      return jsonError('roleId and permissionIds are required.', 400)
    }

    const role = await setRolePermissions(body.roleId, body.permissionIds)

    return Response.json({
      success: true,
      data: role,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to update role permissions',
      403
    )
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'permissions.manage')

    const body = (await request.json()) as {
      name?: string
      description?: string | null
    }

    if (!body.name) {
      return jsonError('Permission name is required.', 400)
    }

    const permission = await createPermission({
      name: body.name,
      description: body.description,
    })

    return Response.json({
      success: true,
      data: permission,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to create permission',
      403
    )
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'permissions.manage')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return jsonError('Permission id is required.', 400)
    }

    await deletePermission(id)

    return Response.json({ success: true })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to delete permission',
      403
    )
  }
}
