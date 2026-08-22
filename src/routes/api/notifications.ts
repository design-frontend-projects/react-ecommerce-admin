import { createFileRoute } from '@tanstack/react-router'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendNotification,
  getSentNotificationsLog,
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
} from '@/server/fns/notifications'
import { jsonError } from '@/server/utils/http'
import { withAuth } from '@/server/utils/with-auth'

const GET = withAuth(null, async ({ auth, request }) => {
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')

  if (mode === 'admin_history') {
    const log = await getSentNotificationsLog()
    return Response.json({ success: true, data: log })
  }

  if (mode === 'templates') {
    const templates = await getNotificationTemplates()
    return Response.json({ success: true, data: templates })
  }

  // Default: fetch user notifications
  const result = await getUserNotifications(auth.userId)
  return Response.json({ success: true, data: result })
})

const POST = withAuth(null, async ({ auth, request }) => {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'send') {
      const result = await sendNotification(body.payload, auth.userId)
      return Response.json({ success: true, data: result })
    }

    if (action === 'create_template') {
      const template = await createNotificationTemplate(body.payload, auth.userId)
      return Response.json({ success: true, data: template })
    }

    if (action === 'update_template') {
      const template = await updateNotificationTemplate(body.templateId, body.payload)
      return Response.json({ success: true, data: template })
    }

    if (action === 'delete_template') {
      await deleteNotificationTemplate(body.templateId)
      return Response.json({ success: true, data: { id: body.templateId } })
    }

    return jsonError('Invalid action specified', 400)
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Notification action failed',
      400
    )
  }
})

const PATCH = withAuth(null, async ({ auth, request }) => {
  try {
    const body = await request.json()
    const { markAll, userNotificationId } = body

    if (markAll) {
      await markAllNotificationsAsRead(auth.userId)
      return Response.json({ success: true, message: 'All notifications marked as read' })
    }

    if (userNotificationId) {
      await markNotificationAsRead(userNotificationId)
      return Response.json({ success: true, message: 'Notification marked as read' })
    }

    return jsonError('No notification ID or markAll flag provided', 400)
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Failed to update notification status',
      400
    )
  }
})

export const Route = createFileRoute('/api/notifications')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
    },
  },
})
