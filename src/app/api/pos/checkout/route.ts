import { NextRequest, NextResponse } from 'next/server'
import { checkoutRequestSchema } from '@/features/pos/schemas/checkout'
import { CheckoutResponse } from '@/features/pos/types'
import { processCheckout } from '@/features/pos/services/CheckoutService'

export async function POST(req: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  try {
    const body = await req.json()
    const parsed = checkoutRequestSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'INVALID_REQUEST', 
          message: 'Invalid checkout request data', 
          details: parsed.error.format() 
        }
      }, { status: 400 })
    }

    const result = await processCheckout(parsed.data)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('POS Checkout Error:', error)
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 })
  }
}
