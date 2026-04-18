import { checkoutRequestSchema } from '@/features/pos/schemas/checkout'
import { processCheckout } from '@/features/pos/services/CheckoutService'

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    console.log(body)

    const parsed = checkoutRequestSchema.safeParse(body)
    console.log('parsed body')
    console.log(parsed)

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

    const result = await processCheckout(parsed.data)

    if (!result.success) {
      return Response.json(result, { status: 400 })
    }

    return Response.json(result, { status: 201 })
  } catch (error: unknown) {
    return Response.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 }
    )
  }
}
