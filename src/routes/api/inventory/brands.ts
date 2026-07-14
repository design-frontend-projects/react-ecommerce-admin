import {
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
  type CreateBrandInput,
  type UpdateBrandInput,
} from '@/server/fns/brands'
import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'

const GET = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')
    const data = await listBrands(userId)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch brands')
  }
}

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const body = (await request.json()) as CreateBrandInput
    const data = await createBrand(userId, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create brand')
  }
}

const PATCH = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Brand id is required.' } },
        { status: 400 }
      )
    }
    const body = (await request.json()) as UpdateBrandInput
    const data = await updateBrand(userId, id, body)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update brand')
  }
}

const DELETE = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.manage')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Brand id is required.' } },
        { status: 400 }
      )
    }
    const data = await deleteBrand(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete brand')
  }
}

export const APIRoute = createAPIFileRoute('/api/inventory/brands')({
  GET,
  POST,
  PATCH,
  DELETE,
})
