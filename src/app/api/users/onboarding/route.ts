import { completeOnboarding } from '@/server/fns/auth'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function POST(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    const authorizedUser = await requireAuth(token)
    const body = (await request.json()) as {
      clerkId?: string
      firstName?: string
      lastName?: string
      phone?: string
    }

    if (!body.clerkId || !body.firstName || !body.lastName) {
      return jsonError('clerkId, firstName, and lastName are required.', 400)
    }

    if (authorizedUser.userId !== body.clerkId) {
      return jsonError('You can only complete onboarding for the signed-in user.', 403)
    }

    const result = await completeOnboarding({
      clerkId: body.clerkId,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
    })

    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to complete onboarding',
      403
    )
  }
}
