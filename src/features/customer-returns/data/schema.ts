import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const customerReturnStatusSchema = z.enum([
  'draft',
  'approved',
  'received',
  'completed',
  'cancelled',
])
export type CustomerReturnStatus = z.infer<typeof customerReturnStatusSchema>

export const customerReturnItemInputSchema = z.object({
  productVariantId: z.string().uuid('Select a product variant.'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0.'),
  goodQty: z.coerce.number().min(0).optional(),
  damagedQty: z.coerce.number().min(0).optional(),
  unitCost: z.coerce.number().min(0).optional(),
  reason: z.string().optional().nullable(),
})

export const createCustomerReturnInputSchema = z.object({
  warehouseId: z.string().uuid('Select a warehouse.'),
  customerId: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z
    .array(customerReturnItemInputSchema)
    .min(1, 'Add at least one return item.'),
})

export type CustomerReturnItemInput = z.infer<typeof customerReturnItemInputSchema>
export type CreateCustomerReturnInput = z.infer<typeof createCustomerReturnInputSchema>

export const customerReturnListItemSchema = z.object({
  id: z.string().uuid(),
  return_no: z.string(),
  status: customerReturnStatusSchema,
  returned_at: z.string(),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  warehouses: z
    .object({ id: z.string(), name: z.string(), code: z.string() })
    .nullable()
    .optional(),
  customers: z
    .object({
      id: z.string(),
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  items: z.array(z.unknown()).optional(),
})

export type CustomerReturnListItem = z.infer<typeof customerReturnListItemSchema>

export const customerReturnsResponseSchema = successEnvelope(
  z.array(customerReturnListItemSchema)
)
