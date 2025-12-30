import { z } from 'zod'

export const inventorySchema = z.object({
  inventory_id: z.number().optional(),
  product_id: z.coerce.number().min(1, 'Product is required'),
  quantity: z.coerce
    .number()
    .int('Must be an integer')
    .min(0, 'Quantity must be 0 or greater'),
  reorder_level: z.coerce.number().int().min(0).optional().nullable(),
  max_stock_level: z.coerce.number().int().min(0).optional().nullable(),
  location: z.string().optional().nullable(),
  last_restocked: z.string().optional().nullable(),
})

export type Inventory = z.infer<typeof inventorySchema> & {
  products?: {
    name: string
  }
}
