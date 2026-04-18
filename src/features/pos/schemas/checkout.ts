import { z } from 'zod'

export const checkoutItemSchema = z.object({
  productId: z.number().int().positive(),
  productVariantId: z.uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountAmount: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
})

export const shipmentSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientPhone: z.string().min(1, 'Recipient phone is required'),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
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
  isShipment: z.boolean().default(false),
  shipment: shipmentSchema.optional(),
})

export type CheckoutRequestType = z.infer<typeof checkoutRequestSchema>
export type ShipmentType = z.infer<typeof shipmentSchema>
