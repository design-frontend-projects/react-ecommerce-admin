import { z } from 'zod'

export const stockConditionEnum = z.enum(['good', 'damaged', 'refurbished', 'returned'])
export type StockCondition = z.infer<typeof stockConditionEnum>

// ── DB row shape from Prisma / Supabase ──
export const stockBalanceSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string(),
  warehouse_id: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  store_id: z.string().uuid().nullable().optional(),
  product_variant_id: z.string().uuid(),
  condition: stockConditionEnum.default('good'),
  batch_id: z.string().uuid().nullable().optional(),
  serial_id: z.string().uuid().nullable().optional(),
  qty_on_hand: z.coerce.number(),
  qty_reserved: z.coerce.number().default(0),
  qty_available: z.coerce.number().nullable().optional(),
  avg_cost: z.coerce.number().default(0),
  valuation: z.coerce.number().optional().default(0),
  last_movement_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type StockBalance = z.infer<typeof stockBalanceSchema>

// ── Joined row shape for UI display & table columns ──
export interface StockBalanceRow extends StockBalance {
  product_variants?: {
    id: string
    sku: string
    barcode?: string | null
    name?: string | null
    products?: {
      id: string
      name: string
      sku?: string | null
      is_batch_tracked?: boolean
      is_serial_tracked?: boolean
      reorder_level?: number | string | null
    } | null
  } | null
  warehouses?: {
    id: string
    name: string | null
    code: string | null
  } | null
  warehouse_locations?: {
    id: string
    name: string | null
    code: string | null
    location_type?: string | null
  } | null
  stores?: {
    store_id: string
    name: string | null
  } | null
}

// ── Aggregation metrics for dashboard cards ──
export interface StockMetrics {
  totalVariants: number
  totalOnHand: number
  totalReserved: number
  totalAvailable: number
  totalValuation: number
  lowStockCount: number
  outOfStockCount: number
}

export interface StockBalancesResponse {
  success: boolean
  items: StockBalanceRow[]
  total: number
  metrics?: StockMetrics
}

export interface StockBalanceFilters {
  warehouseId?: string
  storeId?: string
  locationId?: string
  productVariantId?: string
  condition?: string
  search?: string
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all'
  limit?: number
  offset?: number
}

// ── Inventory movement row for audit trail ──
export interface StockMovementRow {
  id: string
  movement_no?: string | number | null
  movement_type: string
  status: string
  condition?: string
  quantity_delta: number
  qty_before?: number | null
  qty_after?: number | null
  unit_cost: number
  total_cost: number
  reference_type?: string | null
  reference_id?: string | null
  reason_code?: string | null
  remarks?: string | null
  movement_date: string
  created_by?: string | null
}

export type StockBalanceDialogType = 'adjust' | 'movements'
