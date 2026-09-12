import { z } from 'zod'

export const inventorySchema = z.object({
  inventory_id: z.number().optional(),
  product_id: z.string().min(1, 'Product is required'),
  product_variant_id: z.string().optional().nullable().or(z.literal('none')),
  store_id: z.string().optional().nullable().or(z.literal('')).or(z.literal('none')),
  warehouse_id: z.string().optional().nullable().or(z.literal('')).or(z.literal('none')),
  warehouse_location_id: z.string().optional().nullable().or(z.literal('')).or(z.literal('none')),
  reorder_point: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  min_quantity: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  max_quantity: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  last_count_date: z.string().optional().nullable(),
  tenant_id: z.string().optional().nullable(),
  // Compatibility aliases
  quantity: z.coerce.number().int().min(0).optional().nullable(),
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
  barcode?: string | null
  price?: number | null
  dimensions?: unknown
  weight?: number | null
  is_active?: boolean
  attributes_label?: string
}

export interface InventoryWarehouseRelation {
  id: string
  code: string
  name: string
  is_active?: boolean
  is_default?: boolean
}

export interface InventoryLocationRelation {
  id: string
  code: string
  name?: string | null
  location_type?: string | null
  path?: string | null
  is_pickable?: boolean
  is_receivable?: boolean
  is_default?: boolean
}

export interface InventoryStoreRelation {
  store_id: string
  name?: string | null
}

export interface InventoryStockBalanceSummary {
  id: string
  qty_on_hand: number
  qty_reserved: number
  qty_available: number
  avg_cost?: number | null
  condition?: string | null
  last_movement_at?: string | null
}

export type Inventory = {
  inventory_id: number
  product_id: string
  product_variant_id?: string | null
  store_id?: string | null
  warehouse_id?: string | null
  warehouse_location_id?: string | null
  reorder_point?: number | null
  min_quantity?: number | null
  max_quantity?: number | null
  last_count_date?: string | null
  tenant_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  products?: InventoryProductRelation | null
  product_variants?: InventoryVariantRelation | null
  warehouses?: InventoryWarehouseRelation | null
  warehouse_locations?: InventoryLocationRelation | null
  stores?: InventoryStoreRelation | null
  // Stock balance aggregated metrics (derived from stock_balances table)
  qty_on_hand?: number
  qty_reserved?: number
  qty_available?: number
  avg_cost?: number | null
  condition?: string | null
  // Backward compatibility getters
  quantity?: number
  reorder_level?: number | null
  max_stock_level?: number | null
  location?: string | null
  last_restocked?: string | null
}
