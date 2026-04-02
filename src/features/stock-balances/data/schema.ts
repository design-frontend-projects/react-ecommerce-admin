import { z } from 'zod'

// ── DB row shape coming from Supabase ──
export const stockBalanceSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string(),
  store_id: z.string().uuid(),
  product_variant_id: z.string().uuid(),
  qty_on_hand: z.coerce.number(),
  qty_reserved: z.coerce.number(),
  qty_available: z.coerce.number().nullable(),
  avg_cost: z.coerce.number(),
  last_movement_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type StockBalance = z.infer<typeof stockBalanceSchema>

// ── Joined row shape for UI display ──
export interface StockBalanceRow extends StockBalance {
  product_variants?: {
    id: string
    sku: string
    price: number | string
    cost_price: number | string | null
    products?: {
      product_id: number
      name: string
    }
  }
  stores?: {
    store_id: string
    name: string | null
  }
}

// ── Inventory movement type enum ──
export type MovementTypeEnum =
  | 'opening_stock'
  | 'sale'
  | 'sale_return'
  | 'purchase'
  | 'purchase_return'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'damage'
  | 'expired'
  | 'reserved'
  | 'released'

export type StockBalanceDialogType = 'adjust' | 'delete'
