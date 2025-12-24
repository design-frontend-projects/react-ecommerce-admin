import { z } from 'zod'

export const productSchema = z.object({
  product_id: z.number().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional().nullable(),
  base_price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce.number().min(0, 'Cost must be 0 or greater'),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().optional().nullable(),
  category_id: z.coerce.number().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Product = z.infer<typeof productSchema>
