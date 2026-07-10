import { createAPIFileRoute } from '@tanstack/react-start/api'

import {
  createButton,
  deleteButton,
  getButtons,
  updateButton,
} from '@/server/fns/buttons'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

const GET = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'screens.view')

    const data = await getButtons()
    return Response.json({ success: true, data })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to fetch buttons', 403)
  }
}

const POST = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'buttons.manage')

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
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to create button', 403)
  }
}

const PATCH = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'buttons.manage')

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
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to update button', 403)
  }
}

const DELETE = async ({ request, params }: any) => {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'buttons.manage')

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return jsonError('Button id is required.', 400)
    }

    await deleteButton(id)
    return Response.json({ success: true })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to delete button', 403)
  }
}


export const APIRoute = createAPIFileRoute('/api/rbac/buttons')({
  GET,
  POST,
  PATCH,
  DELETE,
})
