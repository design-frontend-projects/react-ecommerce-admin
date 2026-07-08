import { setScreenButtons } from '@/server/fns/buttons'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function PUT(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'buttons.manage')

    const body = (await request.json()) as {
      screenId?: string
      buttonIds?: string[]
    }

    if (!body.screenId || !Array.isArray(body.buttonIds)) {
      return jsonError('screenId and buttonIds are required.', 400)
    }

    await setScreenButtons(body.screenId, body.buttonIds)

    return Response.json({ success: true })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to update screen buttons',
      403
    )
  }
}
