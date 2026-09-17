import { createFileRoute } from '@tanstack/react-router'
import { handleRouteError } from '@/server/utils/api-error'
import { withAuth } from '@/server/utils/with-auth'
import { PERMISSIONS } from '@/features/users/data/permission-constants'
import { processPosSale } from '@/server/fns/pos-checkout-engine'
import { z } from 'zod'

const checkoutSchema = z.object({
  terminalId: z.string().uuid(),
  sessionId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid().nullable().optional(),
  priceListId: z.string().uuid().nullable().optional(),
  items: z
    .array(
      z.object({
        productVariantId: z.string().uuid(),
        sku: z.string().optional(),
        productName: z.string().optional(),
        variantName: z.string().optional(),
        quantity: z.union([z.number().positive(), z.string()]),
        unitPrice: z.union([z.number().nonnegative(), z.string()]),
        unitCost: z.union([z.number().nonnegative(), z.string()]).optional(),
        discountAmount: z.union([z.number().nonnegative(), z.string()]).optional(),
        taxAmount: z.union([z.number().nonnegative(), z.string()]).optional(),
        taxRateId: z.string().uuid().nullable().optional(),
        batchId: z.string().uuid().nullable().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  payments: z
    .array(
      z.object({
        method: z.enum(['cash', 'card', 'bank_transfer', 'wallet', 'cheque', 'mixed']),
        amount: z.union([z.number().positive(), z.string()]),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one payment is required'),
  orderDiscountAmount: z.union([z.number().nonnegative(), z.string()]).optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

const POST = withAuth(PERMISSIONS.POS_SELL, async ({ request, auth }) => {
  try {
    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)

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

    const result = await processPosSale(auth.userId, parsed.data)

    return Response.json(
      { success: true, data: result },
      { status: result.isDuplicate ? 200 : 201 }
    )
  } catch (error: unknown) {
    return handleRouteError(error, 'Checkout failed')
  }
})

export const Route = createFileRoute('/api/pos/checkout')({
  server: {
    handlers: {
      POST,
    },
  },
})
