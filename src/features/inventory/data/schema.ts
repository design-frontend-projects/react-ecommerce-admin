import { z } from 'zod'

export const inventorySchema = z.object({
  inventory_id: z.number().optional(),
  product_id: z.string().min(1, 'Product is required'),
  product_variant_id: z.string().optional().nullable(),
  quantity: z.coerce
    .number()
    .int('Must be an integer')
    .min(0, 'Quantity must be 0 or greater'),
  reorder_point: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  min_quantity: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  max_quantity: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  last_count_date: z.string().optional().nullable(),
  store_id: z.string().optional().nullable(),
  tenant_id: z.string().optional().nullable(),
  // Compatibility aliases
  reorder_level: z.coerce.number().int().min(0).optional().nullable(),
  max_stock_level: z.coerce.number().int().min(0).optional().nullable(),
  location: z.string().optional().nullable(),
  last_restocked: z.string().optional().nullable(),
})

export type InventoryFormValues = z.infer<typeof inventorySchema>

export interface InventoryProductRelation {
  id: string
  name: string
  sku?: string | null
  has_variants?: boolean | null
}

export interface InventoryVariantRelation {
  id: string
  product_id?: string
  name?: string | null
  sku: string
  price?: number | string | null
  stock_quantity?: number | null
}

export type Inventory = {
  inventory_id: number
  product_id: string
  product_variant_id?: string | null
  quantity: number
  reorder_point?: number | null
  min_quantity?: number | null
  max_quantity?: number | null
  last_count_date?: string | null
  store_id?: string | null
  tenant_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  products?: InventoryProductRelation | null
  product_variants?: InventoryVariantRelation | null
  // Compatibility getters
  reorder_level?: number | null
  max_stock_level?: number | null
  location?: string | null
  last_restocked?: string | null
}
