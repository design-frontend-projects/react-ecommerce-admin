import { z } from 'zod'

export const inventorySchema = z.object({
  id: z.string().optional(),
  product_id: z.string().min(1, 'Product is required'),
  product_variant_id: z.string().optional().nullable(),
  sku: z.string().optional(),
  barcode: z.string().optional().nullable(),
  is_stockable: z.boolean().optional().default(true),
  is_sellable: z.boolean().optional().default(true),
  is_purchasable: z.boolean().optional().default(true),
  tracking_type: z.enum(['NONE', 'LOT', 'SERIAL', 'LOT_AND_SERIAL']).optional().default('NONE'),
  unit_of_measure_id: z.string().optional().nullable().or(z.literal('')).or(z.literal('none')),
  status: z.string().optional().default('ACTIVE'),
  is_active: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
  tenant_id: z.string().optional().nullable(),

  // Reorder rule thresholds (managed via reorder_rules table)
  store_id: z.string().optional().nullable().or(z.literal('')).or(z.literal('none')),
  warehouse_id: z.string().optional().nullable().or(z.literal('')).or(z.literal('none')),
  warehouse_location_id: z.string().optional().nullable().or(z.literal('')).or(z.literal('none')),
  reorder_point: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  min_quantity: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  max_quantity: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  safety_stock: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  reorder_quantity: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),
  lead_time_days: z.coerce.number().int().min(0, 'Must be positive').optional().nullable(),

  // Physical coordinates & audit (optional/presentation)
  unit_cost: z.coerce.number().min(0, 'Must be positive').optional().nullable(),
  aisle: z.string().optional().nullable(),
  rack: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  last_count_date: z.string().optional().nullable(),
  last_restocked_date: z.string().optional().nullable(),

  // Compatibility aliases
  inventory_id: z.union([z.string(), z.number()]).optional(),
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
  barcode?: string | null
  brand?: string | null
  category?: string | null
}

export interface InventoryVariantRelation {
  id: string
  product_id?: string
  name?: string | null
  sku: string
  barcode?: string | null
  price?: number | null
  cost_price?: number | null
  dimensions?: unknown
  weight?: number | null
  is_active?: boolean
  attributes_label?: string
  qty_on_hand?: number
  qty_available?: number
  qty_reserved?: number
  products?: InventoryProductRelation | null
}

export interface InventoryWarehouseRelation {
  id: string
  code: string
  name: string
  is_active?: boolean
  is_default?: boolean
  phone?: string | null
  email?: string | null
  address?: string | null
  allow_negative_stock?: boolean
  is_store_default?: boolean
  priority?: number
  allow_fulfillment?: boolean
  allow_replenishment?: boolean
  allow_returns?: boolean
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

export interface InventoryUomRelation {
  id: string
  code: string
  name: string
  is_base?: boolean
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
  id: string
  tenant_id: string
  product_variant_id: string
  sku: string
  barcode?: string | null
  is_stockable: boolean
  is_sellable: boolean
  is_purchasable: boolean
  tracking_type: 'NONE' | 'LOT' | 'SERIAL' | 'LOT_AND_SERIAL' | string
  unit_of_measure_id?: string | null
  status: string
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
  created_by_user_id?: string | null
  updated_by_user_id?: string | null

  // Joined catalog data
  product_id?: string
  products?: InventoryProductRelation | null
  product_variants?: InventoryVariantRelation | null
  uoms?: InventoryUomRelation | null

  // Reorder thresholds (from reorder_rules)
  store_id?: string | null
  warehouse_id?: string | null
  warehouse_location_id?: string | null
  reorder_point?: number | null
  min_quantity?: number | null
  max_quantity?: number | null
  safety_stock?: number | null
  reorder_quantity?: number | null
  lead_time_days?: number | null
  warehouses?: InventoryWarehouseRelation | null
  warehouse_locations?: InventoryLocationRelation | null
  stores?: InventoryStoreRelation | null

  // Real-time stock balance metrics (aggregated from stock_balances)
  qty_on_hand?: number
  qty_reserved?: number
  qty_available?: number
  avg_cost?: number | null
  unit_cost?: number | null
  condition?: string | null

  // Physical coordinates / audit
  aisle?: string | null
  rack?: string | null
  shelf?: string | null
  bin?: string | null
  last_count_date?: string | null
  last_restocked_date?: string | null

  // Compatibility getters (mapped to id)
  inventory_id?: string | number
  quantity?: number
  reorder_level?: number | null
  max_stock_level?: number | null
  location?: string | null
  last_restocked?: string | null
}
