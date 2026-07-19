import {
  createScreen,
  deleteScreen,
  getScreensWithAccess,
  updateScreen,
} from '@/server/fns/screens'
import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(PERMISSIONS.SCREENS_VIEW, async () => {
  const data = await getScreensWithAccess()
  return Response.json({ success: true, data })
})

const POST = withAuth(PERMISSIONS.SCREENS_MANAGE, async ({ request }) => {
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
})

const PATCH = withAuth(PERMISSIONS.SCREENS_MANAGE, async ({ request }) => {
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
})

const DELETE = withAuth(PERMISSIONS.SCREENS_MANAGE, async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return jsonError('Screen id is required.', 400)
  }

  await deleteScreen(id)
  return Response.json({ success: true })
})

export const APIRoute = createAPIFileRoute('/api/rbac/screens')({
  GET,
  POST,
  PATCH,
  DELETE,
})
