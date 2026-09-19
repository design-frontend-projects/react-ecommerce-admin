import { createFileRoute } from '@tanstack/react-router'
import {
  getDiscountApprovalRequests,
  createDiscountApprovalRequest,
  reviewDiscountApprovalRequest,
  type GetApprovalsFilter,
  type CreateApprovalInput,
} from '@/server/fns/discount-approvals'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'

const GET = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const { searchParams } = new URL(request.url)
    const filter: GetApprovalsFilter = {
      status:
        (searchParams.get('status') as 'pending' | 'approved' | 'rejected') ||
        undefined,
      storeId: searchParams.get('storeId') || undefined,
      branchId: searchParams.get('branchId') || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
    }
    const data = await getDiscountApprovalRequests(userId, filter)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to fetch discount approvals')
  }
})

const POST = withAuth(null, async ({ auth, request }) => {
  try {
    const { userId } = auth
    const body = await request.json()
    if (body.action === 'review') {
      const data = await reviewDiscountApprovalRequest(
        userId,
        body.id,
        Boolean(body.approved),
        body.rejectionReason
      )
      return Response.json({ success: true, data })
    }
    const data = await createDiscountApprovalRequest(userId, body as CreateApprovalInput)
    return Response.json({ success: true, data })
  } catch (error) {
    return handleRouteError(error, 'Unable to process discount approval request')
  }
})

export const Route = createFileRoute('/api/discount-approvals')({
  server: {
    handlers: {
      GET,
      POST,
    },
  },
})
