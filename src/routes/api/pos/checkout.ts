import { handleRouteError } from '@/server/utils/api-error'
import { getBearerToken, requireAuth } from '@/server/utils/auth'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { checkoutRequestSchema } from '@/features/pos/schemas/checkout'
import { processCheckout } from '@/features/pos/services/CheckoutService'

const POST = async ({ request }: any) => {
  try {
    const token = getBearerToken(request)
    const { userId } = await requireAuth(token, 'inventory.view')

    const body = await request.json()
    const parsed = checkoutRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid checkout request data',
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      )
    }

    const result = await processCheckout(parsed.data, userId)

    if (!result.success) {
      return Response.json(result, { status: 400 })
    }

    return Response.json(result, { status: 201 })
  } catch (error: unknown) {
    return handleRouteError(error, 'Checkout failed')
  }
}

export const APIRoute = createAPIFileRoute('/api/pos/checkout')({
  POST,
})
