import { createFileRoute } from '@tanstack/react-router'
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  changePromotionStatus,
  duplicatePromotion,
  deletePromotion,
  getPromotionUsageStats,
  getPromotionLookupData,
  type GetPromotionsFilter,
  type PromotionMutationInput,
} from '@/server/fns/promotions-crud'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import type { PromotionStatus } from '@/features/promotions/types'

const GET = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (action === 'lookups') {
      const data = await getPromotionLookupData(userId)
      return Response.json({ success: true, data })
    }

    if (action === 'stats') {
      const data = await getPromotionUsageStats(userId)
      return Response.json({ success: true, data })
    }

    if (id) {
      const data = await getPromotionById(userId, id)
      return Response.json({ success: true, data })
    }

    const filter: GetPromotionsFilter = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as PromotionStatus | 'all') || undefined,
      promoType: searchParams.get('promoType') || undefined,
      channelId: searchParams.get('channelId') || undefined,
      branchId: searchParams.get('branchId') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    }

    const data = await getPromotions(userId, filter)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch promotions')
  }
})

const POST = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const body = await request.json()
    const { action, id, ...rest } = body

    if (action === 'duplicate' && id) {
      const data = await duplicatePromotion(userId, id)
      return Response.json({ success: true, data })
    }

    const data = await createPromotion(userId, rest as PromotionMutationInput)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create promotion')
  }
})

const PATCH = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const body = await request.json()
    const id = searchParams.get('id') || body.id

    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Promotion id is required.' } },
        { status: 400 }
      )
    }

    if (body.action === 'status' || body.status) {
      const data = await changePromotionStatus(userId, id, body.status as PromotionStatus)
      return Response.json({ success: true, data })
    }

    const input = body.input || body
    const data = await updatePromotion(userId, id, input as PromotionMutationInput)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update promotion')
  }
})

const DELETE = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Promotion id is required.' } },
        { status: 400 }
      )
    }

    const data = await deletePromotion(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete promotion')
  }
})

export const Route = createFileRoute('/api/promotions')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
