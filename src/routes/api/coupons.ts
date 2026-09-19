import { createFileRoute } from '@tanstack/react-router'
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  changeCouponStatus,
  deleteCoupon,
  generateBulkCoupons,
  type GetCouponsFilter,
  type CouponMutationInput,
  type BulkCouponGenerateInput,
} from '@/server/fns/coupons-crud'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import type { CouponStatus } from '@/features/promotions/types'

const GET = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const filter: GetCouponsFilter = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as CouponStatus | 'all') || undefined,
      promotionId: searchParams.get('promotionId') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
    }
    const data = await getCoupons(userId, filter)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch coupons')
  }
})

const POST = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const body = await request.json()
    if (body.action === 'bulk') {
      const data = await generateBulkCoupons(userId, body.payload as BulkCouponGenerateInput)
      return Response.json({ success: true, data })
    }
    const data = await createCoupon(userId, body as CouponMutationInput)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to create coupon')
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
        { success: false, error: { message: 'Coupon id is required.' } },
        { status: 400 }
      )
    }

    if (body.action === 'status' || body.status) {
      const data = await changeCouponStatus(userId, id, body.status as CouponStatus)
      return Response.json({ success: true, data })
    }

    const data = await updateCoupon(userId, id, (body.input || body) as Partial<CouponMutationInput>)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to update coupon')
  }
})

const DELETE = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json(
        { success: false, error: { message: 'Coupon id is required.' } },
        { status: 400 }
      )
    }
    const data = await deleteCoupon(userId, id)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to delete coupon')
  }
})

export const Route = createFileRoute('/api/coupons')({
  server: {
    handlers: {
      GET,
      POST,
      PATCH,
      DELETE,
    },
  },
})
