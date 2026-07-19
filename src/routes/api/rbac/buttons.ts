import {
  createButton,
  deleteButton,
  getButtons,
  updateButton,
} from '@/server/fns/buttons'
import { withAuth } from '@/server/utils/with-auth'
import { jsonError } from '@/server/utils/http'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = withAuth(PERMISSIONS.SCREENS_VIEW, async () => {
  const data = await getButtons()
  return Response.json({ success: true, data })
})

const POST = withAuth(PERMISSIONS.BUTTONS_MANAGE, async ({ request }) => {
  const body = (await request.json()) as {
    code?: string
    name?: string
    description?: string | null
  }

  if (!body.code || !body.name) {
    return jsonError('code and name are required.', 400)
  }

  const button = await createButton({
    code: body.code,
    name: body.name,
    description: body.description,
  })

  return Response.json({ success: true, data: button })
})

const PATCH = withAuth(PERMISSIONS.BUTTONS_MANAGE, async ({ request }) => {
  const body = (await request.json()) as {
    id?: string
    code?: string
    name?: string
    description?: string | null
  }

  if (!body.id) {
    return jsonError('Button id is required.', 400)
  }

  const button = await updateButton(body.id, {
    code: body.code,
    name: body.name,
    description: body.description,
  })

  return Response.json({ success: true, data: button })
})

const DELETE = withAuth(PERMISSIONS.BUTTONS_MANAGE, async ({ request }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return jsonError('Button id is required.', 400)
  }

  await deleteButton(id)
  return Response.json({ success: true })
})

export const APIRoute = createAPIFileRoute('/api/rbac/buttons')({
  GET,
  POST,
  PATCH,
  DELETE,
})
