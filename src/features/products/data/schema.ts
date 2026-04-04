import { z } from 'zod'

export const productVariantSchema = z.object({
  id: z.string().optional(),
  product_id: z.number().optional(),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce.number().min(0, 'Cost must be 0 or greater').optional().nullable(),
  stock_quantity: z.coerce.number().default(0),
  min_stock: z.coerce.number().default(0),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.any().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const productSchema = z.object({
  product_id: z.number().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional().nullable(),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().optional().nullable(),
  base_price: z.coerce.number().min(0, 'Price must be 0 or greater').optional().nullable(),
  category_id: z.coerce.number().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  has_variants: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  product_variants: z.array(productVariantSchema).optional(),
})

export type ProductVariant = z.infer<typeof productVariantSchema>
export type Product = z.infer<typeof productSchema> & {
  categories?: { name: string } | null
}
