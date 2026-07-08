import {
  createScreen,
  deleteScreen,
  getScreensWithAccess,
  updateScreen,
} from '@/server/fns/screens'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'screens.view')

    const data = await getScreensWithAccess()
    return Response.json({ success: true, data })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to fetch screens', 403)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'screens.manage')

    const body = (await request.json()) as {
      code?: string
      name?: string
      route?: string
      description?: string | null
      icon?: string | null
      moduleId?: string
      sortOrder?: number
    }

    if (!body.code || !body.name || !body.route || !body.moduleId) {
      return jsonError('code, name, route, and moduleId are required.', 400)
    }

    const screen = await createScreen({
      code: body.code,
      name: body.name,
      route: body.route,
      description: body.description,
      icon: body.icon,
      moduleId: body.moduleId,
      sortOrder: body.sortOrder,
    })

    return Response.json({ success: true, data: screen })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to create screen', 403)
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'screens.manage')

    const body = (await request.json()) as {
      id?: string
      name?: string
      route?: string
      code?: string
      description?: string | null
      icon?: string | null
      moduleId?: string
      sortOrder?: number
      isActive?: boolean
    }

    if (!body.id) {
      return jsonError('Screen id is required.', 400)
    }

    const screen = await updateScreen(body.id, {
      name: body.name,
      route: body.route,
      code: body.code,
      description: body.description,
      icon: body.icon,
      moduleId: body.moduleId,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    })

    return Response.json({ success: true, data: screen })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to update screen', 403)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'screens.manage')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return jsonError('Screen id is required.', 400)
    }

    await deleteScreen(id)
    return Response.json({ success: true })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to delete screen', 403)
  }
}
