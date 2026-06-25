import prisma from '@/lib/prisma'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token)

    const subscription = await prisma.tenant_subscriptions.findFirst({
      where: { auth_user_id: authorizedUser.userId },
      orderBy: { created_at: 'desc' },
    })

    if (!subscription) {
      return jsonError('No tenant subscription record found for authenticated user', 404)
    }

    const now = new Date()
    const is_active = subscription.status === 'paid' && 
                      (!subscription.end_date || subscription.end_date > now)

    return Response.json({
      tenant_id: subscription.id,
      status: subscription.status,
      end_date: subscription.end_date,
      is_active,
      first_use: subscription.first_use,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to check subscription status',
      401
    )
  }
}
