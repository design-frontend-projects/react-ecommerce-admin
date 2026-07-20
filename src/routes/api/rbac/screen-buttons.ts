import { createFileRoute } from '@tanstack/react-router'
import { setScreenButtons } from '@/server/fns/buttons'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

const PUT = withAuth(PERMISSIONS.BUTTONS_MANAGE, async ({ request }) => {
  const body = (await request.json()) as {
    screenId?: string
    buttonIds?: string[]
  }

  if (!body.screenId || !Array.isArray(body.buttonIds)) {
    return jsonError('screenId and buttonIds are required.', 400)
  }

  await setScreenButtons(body.screenId, body.buttonIds)

  return Response.json({ success: true })
})

export const Route = createFileRoute('/api/rbac/screen-buttons')({
  server: {
    handlers: {
      PUT,
    },
  },
})
