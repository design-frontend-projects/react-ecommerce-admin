import { createRole, deleteRole, getRolesPermissions, updateRole } from '@/server/fns/rbac'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'users.view')

    const payload = await getRolesPermissions()
    return Response.json({
      success: true,
      data: payload,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to fetch RBAC data', 403)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'roles.manage')

    const body = (await request.json()) as {
      name?: string
      description?: string
      permissionIds?: string[]
    }

    if (!body.name) {
      return jsonError('Role name is required.', 400)
    }

    const role = await createRole({
      name: body.name,
      description: body.description,
      permissionIds: body.permissionIds,
    })

    return Response.json({
      success: true,
      data: role,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to create role', 403)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'roles.manage')

    const body = (await request.json()) as {
      id?: string
      name?: string
      description?: string | null
      is_active?: boolean
    }

    if (!body.id) {
      return jsonError('Role id is required.', 400)
    }

    const role = await updateRole({
      id: body.id,
      name: body.name,
      description: body.description ?? undefined,
      is_active: body.is_active,
    })

    return Response.json({
      success: true,
      data: role,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to update role', 403)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'roles.manage')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return jsonError('Role id is required.', 400)
    }

    await deleteRole(id)

    return Response.json({
      success: true,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to delete role', 403)
  }
}
