import { z } from 'zod'

export const adjustmentSchema = z.object({
  store_id: z.string().uuid('Store is required'),
  product_variant_id: z.string().uuid('Product variant is required'),
  adjustment_type: z.enum(['set', 'offset'], {
    message: 'Select adjustment type',
  }),
  quantity: z.coerce.number({
    message: 'Quantity must be a number',
  }),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
})

export type AdjustmentFormData = z.infer<typeof adjustmentSchema>
