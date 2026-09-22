export type StockAlertUrgency = 'critical' | 'high' | 'medium'
export type StockAlertStatus = 'out_of_stock' | 'low_stock' | 'expiring' | 'expired'
export type MovementTrend = 'up' | 'down' | 'neutral'

export interface DashboardKPIs {
  totalInventoryValue: number
  inventoryValueChange: number // percentage e.g. +4.5 or -1.2
  activeSkus: number
  totalSkus: number
  stockHealthScore: number // percentage 0 - 100
  stockHealthChange: number
  salesToday: number
  salesTodayChange: number
  pendingPoValue: number
  pendingPoCount: number
  expiringBatchesCount: number
  expiredBatchesCount: number
}

export interface CriticalAlertCounts {
  outOfStockCount: number
  lowStockCount: number
  expiredCount: number
  expiringSoonCount: number
  overduePoCount: number
  totalCritical: number
}

export interface StockAlertItem {
  id: string
  productId: string
  variantId: string
  name: string
  sku: string
  categoryName: string
  warehouseName: string
  qtyOnHand: number
  qtyAvailable: number
  minQuantity: number
  reorderPoint: number
  status: StockAlertStatus
  urgency: StockAlertUrgency
  batchNumber?: string
  expiryDate?: string
  daysToExpiry?: number
  costPrice: number
}

export interface SalesTrendPoint {
  date: string // e.g. "Mar 16"
  fullDate: string // "2026-03-16"
  revenue: number
  invoicesCount: number
}

export interface CategoryBreakdown {
  id: string
  name: string
  value: number
  percentage: number
  itemCount: number
  color: string
}

export interface OverduePurchaseOrder {
  id: string
  poNumber: string
  supplierName: string
  orderDate: string
  expectedDeliveryDate: string
  daysOverdue: number
  totalAmount: number
  currency: string
  status: string
  itemsCount: number
}

export interface PoStatusDistribution {
  status: string
  label: string
  count: number
  value: number
  color: string
}

export interface TopMoverItem {
  variantId: string
  productName: string
  sku: string
  categoryName: string
  outboundQty: number
  inboundQty: number
  totalMovements: number
  turnoverRate?: number
  trend: MovementTrend
}

export interface WarehouseFilterOption {
  id: string
  name: string
  code?: string | null
  isDefault?: boolean
}

export interface DashboardCurrency {
  code: string
  symbol: string
}

export interface DashboardAnalytics {
  kpis: DashboardKPIs
  criticalAlerts: CriticalAlertCounts
  stockAlerts: StockAlertItem[]
  salesTrend7Days: SalesTrendPoint[]
  salesTrend30Days: SalesTrendPoint[]
  categoryBreakdown: CategoryBreakdown[]
  poDistribution: PoStatusDistribution[]
  overduePurchaseOrders: OverduePurchaseOrder[]
  topMovers: TopMoverItem[]
  warehouses: WarehouseFilterOption[]
  currency: DashboardCurrency
  lastUpdated: string
}

export interface DashboardFilterState {
  warehouseId: string // 'all' or UUID
  timeRange: '7d' | '30d' | '90d'
}
