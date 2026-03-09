import { z } from 'zod'

export const posDiscountSchema = z.object({
  type: z.enum(['fixed', 'percentage']),
  value: z.number().min(0),
})

export const basketItemSchema = z.object({
  productId: z.number(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  unitPrice: z.number(),
  quantity: z.number().min(1),
  discount: posDiscountSchema.optional(),
  subtotal: z.number(), // unitPrice * quantity
  total: z.number(), // subtotal - discount amount
})

export type PosDiscount = z.infer<typeof posDiscountSchema>
export type BasketItem = z.infer<typeof basketItemSchema>

export const posTransactionSchema = z.object({
  items: z.array(basketItemSchema),
  subtotal: z.number(),
  cartDiscount: posDiscountSchema.optional(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  paymentMethod: z.enum(['cash', 'card']).optional(),
  status: z.enum(['pending', 'completed', 'refunded']),
  notes: z.string().optional(),
})

export type PosTransaction = z.infer<typeof posTransactionSchema>
