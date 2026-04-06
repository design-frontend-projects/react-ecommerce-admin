import { z } from 'zod'

export const checkoutItemSchema = z.object({
  productId: z.number().int().positive(),
  productVariantId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountAmount: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
})

export const checkoutRequestSchema = z.object({
  branchId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  customerId: z.number().int().positive().optional(),
  paymentMethod: z.enum(['cash', 'card', 'mixed']),
  items: z.array(checkoutItemSchema).min(1),
  subtotal: z.number().min(0),
  totalAmount: z.number().min(0),
  discountTotal: z.number().min(0).optional().default(0),
  taxTotal: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
})

export type CheckoutRequestType = z.infer<typeof checkoutRequestSchema>
