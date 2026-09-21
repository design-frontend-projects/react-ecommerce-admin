import { z } from 'zod'

export const valuationMethodEnum = z.enum(['avco', 'standard', 'fifo', 'retail'])
export type ValuationMethod = z.infer<typeof valuationMethodEnum>

export const valuationStockStatusEnum = z.enum([
  'all',
  'in_stock',
  'low_stock',
  'out_of_stock',
  'high_value',
])
export type ValuationStockStatus = z.infer<typeof valuationStockStatusEnum>

export const valuationFiltersSchema = z.object({
  search: z.string().optional().default(''),
  warehouseId: z.string().optional().default('all'),
  storeId: z.string().optional().default('all'),
  categoryId: z.string().optional().default('all'),
  supplierId: z.string().optional().default('all'),
  condition: z.string().optional().default('all'),
  stockStatus: valuationStockStatusEnum.optional().default('all'),
  valuationMethod: valuationMethodEnum.optional().default('avco'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(200).optional().default(25),
  sortBy: z.enum([
    'totalValue',
    'onHand',
    'unitCost',
    'productName',
    'sku',
    'potentialRevenue',
    'potentialMargin',
  ]).optional().default('totalValue'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type ValuationFilters = z.infer<typeof valuationFiltersSchema>
export type ValuationFiltersInput = z.input<typeof valuationFiltersSchema>

export interface ValuationItemRow {
  id: string
  balanceId: string
  warehouseId?: string | null
  warehouseName?: string | null
  warehouseCode?: string | null
  storeId?: string | null
  storeName?: string | null
  locationId?: string | null
  locationName?: string | null
  locationCode?: string | null
  variantId: string
  sku: string
  barcode?: string | null
  productName: string
  productId: string
  categoryId?: string | null
  categoryName: string
  supplierId?: string | null
  supplierName?: string | null
  condition: string
  onHand: number
  reserved: number
  available: number
  reorderLevel: number
  avcoUnitCost: number
  standardUnitCost: number
  fifoUnitCost: number
  unitCost: number
  sellingPrice: number
  totalValue: number
  potentialRevenue: number
  potentialMargin: number
  sharePercent: number
  lastMovementAt?: string | null
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  currencySymbol?: string
}

export interface ValuationMetrics {
  totalValuation: number
  totalUnits: number
  totalPotentialRevenue: number
  averageMargin: number
  lowStockCount: number
  outOfStockCount: number
  totalLines: number
  methodTotals: {
    avco: number
    standard: number
    fifo: number
    retail: number
  }
}

export interface TenantCurrencyInfo {
  currencyId: string | null
  currencyCode: string
  currencySymbol: string
  currencyName?: string | null
}

export interface ValuationResponse {
  success?: boolean
  items: ValuationItemRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  metrics: ValuationMetrics
  currency?: TenantCurrencyInfo
}

export interface ValuationFilterLookups {
  warehouses: Array<{ id: string; name: string; code: string | null }>
  stores: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
  suppliers: Array<{ id: string; name: string; code?: string | null }>
  currency?: TenantCurrencyInfo
}
