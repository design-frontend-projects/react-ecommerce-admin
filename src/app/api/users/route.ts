import { getUsers } from '@/server/fns/users'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { jsonError } from '@/server/utils/http'

export async function GET(request: Request): Promise<Response> {
  try {
    const token = getBearerToken(request)
    await requireAuth(token, 'users.view')

    const users = await getUsers()
    return Response.json({
      success: true,
      data: users,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to fetch users', 403)
  }
}
