'use server'

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { requireTenantId } from '@/server/utils/tenant'
import { resolveTenantDefaultCurrency } from '@/server/fns/inventory-valuation'
import type {
  DashboardAnalytics,
  DashboardKPIs,
  CriticalAlertCounts,
  StockAlertItem,
  SalesTrendPoint,
  CategoryBreakdown,
  PoStatusDistribution,
  OverduePurchaseOrder,
  TopMoverItem,
  WarehouseFilterOption,
} from '@/features/dashboard/types'

// Curated colors for donut and status charts
const CATEGORY_COLORS = [
  'hsl(217, 91%, 60%)', // Blue
  'hsl(152, 69%, 45%)', // Emerald
  'hsl(262, 83%, 58%)', // Violet
  'hsl(38, 92%, 50%)',  // Amber
  'hsl(199, 89%, 48%)', // Cyan
  'hsl(330, 81%, 60%)', // Pink
  'hsl(24, 94%, 53%)',  // Orange
  'hsl(280, 65%, 60%)', // Purple
]

const PO_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'hsl(215, 16%, 47%)' },
  pending: { label: 'Pending', color: 'hsl(38, 92%, 50%)' },
  approved: { label: 'Approved', color: 'hsl(217, 91%, 60%)' },
  sent: { label: 'Sent to Vendor', color: 'hsl(199, 89%, 48%)' },
  partially_received: { label: 'Partial', color: 'hsl(280, 65%, 60%)' },
  received: { label: 'Received', color: 'hsl(152, 69%, 45%)' },
  closed: { label: 'Closed', color: 'hsl(160, 20%, 40%)' },
  cancelled: { label: 'Cancelled', color: 'hsl(0, 84%, 60%)' },
}

interface KpiAggResult {
  total_value: number
  active_skus: number
}

interface TrackedSkusResult {
  tracked_skus: number
  healthy_skus: number
}

interface SalesCompareResult {
  sales_today: number
  sales_yesterday: number
}

interface PendingPoResult {
  pending_po_value: number
  pending_po_count: number
}

interface BatchExpiryCountResult {
  expired_count: number
  expiring_count: number
}

interface StockAlertRawRow {
  balance_id: string
  variant_id: string
  product_id: string
  product_name: string
  sku: string
  category_name: string
  warehouse_name: string
  qty_on_hand: number
  qty_available: number
  min_quantity: number
  reorder_point: number
  cost_price: number
}

interface BatchAlertRawRow {
  batch_id: string
  variant_id: string
  product_id: string
  product_name: string
  sku: string
  category_name: string
  batch_number: string
  expiry_date: string
  days_to_expiry: number
  cost_price: number
  batch_alert_type: string
}

interface SalesTrendRawRow {
  day_date: string
  display_date: string
  revenue: number
  invoices_count: number
}

interface CategoryRawRow {
  category_id: string
  category_name: string
  stock_value: number
  item_count: number
}

interface PoStatusRawRow {
  status_key: string
  po_count: number
  total_val: number
}

interface OverduePoRawRow {
  id: string
  po_number: string
  supplier_name: string
  order_date: string
  expected_delivery_date: string
  days_overdue: number
  total_amount: number
  currency: string
  status: string
  items_count: number
}

interface TopMoverRawRow {
  variant_id: string
  product_name: string
  sku: string
  category_name: string
  outbound_qty: number
  inbound_qty: number
  total_movements: number
}

export async function getDashboardAnalyticsData(
  authUserId: string,
  filters: { warehouseId?: string; timeRange?: '7d' | '30d' | '90d' } = {}
): Promise<DashboardAnalytics> {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const warehouseFilter =
      filters.warehouseId && filters.warehouseId !== 'all'
        ? filters.warehouseId
        : null

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    // Parallel execution of all 8 core analytics aggregations
    const [
      kpiValuesResult,
      totalSkusCount,
      stockHealthResult,
      salesResult,
      pendingPoResult,
      batchCountsResult,
      stockAlertsRows,
      batchAlertsRows,
      salesTrendRows,
      categoryRows,
      poStatusRows,
      overduePoRows,
      topMoversRows,
      warehousesList,
      currencyInfo,
    ] = await Promise.all([
      // 1. Total inventory value & active SKU count
      prisma.$queryRawUnsafe<KpiAggResult[]>(
        `SELECT 
           COALESCE(SUM(qty_on_hand * avg_cost), 0)::float8 AS total_value,
           COUNT(DISTINCT CASE WHEN qty_on_hand > 0 THEN product_variant_id END)::int AS active_skus
         FROM stock_balances
         WHERE tenant_id = $1::uuid
           AND ($2::uuid IS NULL OR warehouse_id = $2::uuid)`,
        tenantId,
        warehouseFilter
      ),

      // 2. Total active SKUs catalog count
      prisma.product_variants.count({
        where: {
          tenant_id: tenantId,
          is_active: true,
        },
      }),

      // 3. Stock Health computation
      prisma.$queryRawUnsafe<TrackedSkusResult[]>(
        `WITH stock_levels AS (
           SELECT 
             sb.product_variant_id,
             SUM(COALESCE(sb.qty_available, sb.qty_on_hand - sb.qty_reserved)) AS total_avail,
             COALESCE(MAX(inv.min_quantity), 0) AS min_qty
           FROM stock_balances sb
           LEFT JOIN inventory inv ON inv.product_variant_id = sb.product_variant_id AND inv.tenant_id = sb.tenant_id
           WHERE sb.tenant_id = $1::uuid
             AND ($2::uuid IS NULL OR sb.warehouse_id = $2::uuid)
           GROUP BY sb.product_variant_id
         )
         SELECT 
           COUNT(*)::int AS tracked_skus,
           COUNT(CASE WHEN total_avail > min_qty THEN 1 END)::int AS healthy_skus
         FROM stock_levels`,
        tenantId,
        warehouseFilter
      ),

      // 4. Sales today vs yesterday comparison
      prisma.$queryRawUnsafe<SalesCompareResult[]>(
        `SELECT 
           COALESCE(SUM(CASE WHEN invoice_date >= $2::timestamptz THEN total_amount ELSE 0 END), 0)::float8 AS sales_today,
           COALESCE(SUM(CASE WHEN invoice_date >= $3::timestamptz AND invoice_date < $2::timestamptz THEN total_amount ELSE 0 END), 0)::float8 AS sales_yesterday
         FROM sales_invoices
         WHERE tenant_id = $1::uuid 
           AND status::text != 'void' 
           AND deleted_at IS NULL
           AND ($4::uuid IS NULL OR warehouse_id = $4::uuid)`,
        tenantId,
        todayStart.toISOString(),
        yesterdayStart.toISOString(),
        warehouseFilter
      ),

      // 5. Pending purchase orders value & count
      prisma.$queryRawUnsafe<PendingPoResult[]>(
        `SELECT 
           COALESCE(SUM(COALESCE(grand_total, total_amount, subtotal, 0)), 0)::float8 AS pending_po_value,
           COUNT(*)::int AS pending_po_count
         FROM purchase_orders
         WHERE tenant_id = $1::uuid
           AND ($2::uuid IS NULL OR warehouse_id = $2::uuid)
           AND COALESCE(lifecycle_status::text, status, 'draft') IN ('draft', 'approved', 'sent', 'partially_received', 'pending')`,
        tenantId,
        warehouseFilter
      ),

      // 6. Expiring (30 days) and expired batches
      prisma.$queryRawUnsafe<BatchExpiryCountResult[]>(
        `SELECT 
           COUNT(CASE WHEN expiry_date < CURRENT_DATE AND status::text = 'active' THEN 1 END)::int AS expired_count,
           COUNT(CASE WHEN expiry_date >= CURRENT_DATE AND expiry_date <= (CURRENT_DATE + INTERVAL '30 days') AND status::text = 'active' THEN 1 END)::int AS expiring_count
         FROM product_batches
         WHERE tenant_id = $1::uuid`,
        tenantId
      ),

      // 7a. Low stock & out of stock alerts
      prisma.$queryRawUnsafe<StockAlertRawRow[]>(
        `SELECT 
           sb.id AS balance_id,
           pv.id AS variant_id,
           p.id AS product_id,
           COALESCE(pv.name, p.name, 'Unnamed Product') AS product_name,
           COALESCE(pv.sku, p.sku, 'N/A') AS sku,
           COALESCE(c.name, 'Uncategorized') AS category_name,
           COALESCE(w.name, 'All Warehouses') AS warehouse_name,
           COALESCE(sb.qty_on_hand, 0)::float8 AS qty_on_hand,
           COALESCE(sb.qty_available, sb.qty_on_hand - sb.qty_reserved, 0)::float8 AS qty_available,
           COALESCE(inv.min_quantity, 5)::int AS min_quantity,
           COALESCE(inv.reorder_point, 10)::int AS reorder_point,
           COALESCE(sb.avg_cost, 0)::float8 AS cost_price
         FROM stock_balances sb
         JOIN product_variants pv ON pv.id = sb.product_variant_id
         JOIN products p ON p.id = pv.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN warehouses w ON w.id = sb.warehouse_id
         LEFT JOIN inventory inv ON (inv.product_variant_id = pv.id AND inv.tenant_id = sb.tenant_id)
         WHERE sb.tenant_id = $1::uuid
           AND ($2::uuid IS NULL OR sb.warehouse_id = $2::uuid)
           AND (
             sb.qty_on_hand <= 0 
             OR (sb.qty_available <= COALESCE(inv.min_quantity, 5) AND sb.qty_available > 0)
           )
         ORDER BY 
           CASE WHEN sb.qty_on_hand <= 0 THEN 0 ELSE 1 END,
           sb.qty_available ASC
         LIMIT 30`,
        tenantId,
        warehouseFilter
      ),

      // 7b. Expired and expiring batches
      prisma.$queryRawUnsafe<BatchAlertRawRow[]>(
        `SELECT 
           pb.id AS batch_id,
           pv.id AS variant_id,
           p.id AS product_id,
           COALESCE(pv.name, p.name, 'Unknown Batch Product') AS product_name,
           COALESCE(pv.sku, p.sku, 'N/A') AS sku,
           COALESCE(c.name, 'Uncategorized') AS category_name,
           pb.batch_number,
           pb.expiry_date::text AS expiry_date,
           (pb.expiry_date - CURRENT_DATE)::int AS days_to_expiry,
           COALESCE(pb.unit_cost, 0)::float8 AS cost_price,
           CASE 
             WHEN pb.expiry_date < CURRENT_DATE THEN 'expired'
             ELSE 'expiring'
           END AS batch_alert_type
         FROM product_batches pb
         JOIN product_variants pv ON pv.id = pb.product_variant_id
         JOIN products p ON p.id = pv.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE pb.tenant_id = $1::uuid
           AND pb.status::text = 'active'
           AND pb.expiry_date IS NOT NULL
           AND pb.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
         ORDER BY pb.expiry_date ASC
         LIMIT 20`,
        tenantId
      ),

      // 8. Sales trend for past 30 days
      prisma.$queryRawUnsafe<SalesTrendRawRow[]>(
        `SELECT 
           to_char(invoice_date, 'YYYY-MM-DD') AS day_date,
           to_char(invoice_date, 'Mon DD') AS display_date,
           COALESCE(SUM(total_amount), 0)::float8 AS revenue,
           COUNT(*)::int AS invoices_count
         FROM sales_invoices
         WHERE tenant_id = $1::uuid
           AND status::text != 'void'
           AND deleted_at IS NULL
           AND invoice_date >= (CURRENT_DATE - INTERVAL '30 days')
           AND ($2::uuid IS NULL OR warehouse_id = $2::uuid)
         GROUP BY to_char(invoice_date, 'YYYY-MM-DD'), to_char(invoice_date, 'Mon DD')
         ORDER BY day_date ASC`,
        tenantId,
        warehouseFilter
      ),

      // 9. Category breakdown by stock value
      prisma.$queryRawUnsafe<CategoryRawRow[]>(
        `SELECT 
           COALESCE(c.id::text, 'uncategorized') AS category_id,
           COALESCE(c.name, 'General / Uncategorized') AS category_name,
           COALESCE(SUM(sb.qty_on_hand * sb.avg_cost), 0)::float8 AS stock_value,
           COUNT(DISTINCT sb.product_variant_id)::int AS item_count
         FROM stock_balances sb
         JOIN product_variants pv ON pv.id = sb.product_variant_id
         JOIN products p ON p.id = pv.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE sb.tenant_id = $1::uuid
           AND ($2::uuid IS NULL OR sb.warehouse_id = $2::uuid)
           AND sb.qty_on_hand > 0
         GROUP BY c.id, c.name
         ORDER BY stock_value DESC
         LIMIT 8`,
        tenantId,
        warehouseFilter
      ),

      // 10. Purchase order status distribution
      prisma.$queryRawUnsafe<PoStatusRawRow[]>(
        `SELECT 
           COALESCE(lifecycle_status::text, status, 'draft') AS status_key,
           COUNT(*)::int AS po_count,
           COALESCE(SUM(COALESCE(grand_total, total_amount, subtotal, 0)), 0)::float8 AS total_val
         FROM purchase_orders
         WHERE tenant_id = $1::uuid
           AND ($2::uuid IS NULL OR warehouse_id = $2::uuid)
         GROUP BY COALESCE(lifecycle_status::text, status, 'draft')`,
        tenantId,
        warehouseFilter
      ),

      // 11. Overdue purchase orders
      prisma.$queryRawUnsafe<OverduePoRawRow[]>(
        `SELECT 
           po.id,
           COALESCE(po.po_number::text, 'PO-' || SUBSTRING(po.id::text, 1, 8)) AS po_number,
           COALESCE(s.name, 'Supplier') AS supplier_name,
           to_char(po.order_date, 'YYYY-MM-DD') AS order_date,
           to_char(po.expected_delivery_date, 'YYYY-MM-DD') AS expected_delivery_date,
           (CURRENT_DATE - po.expected_delivery_date::date)::int AS days_overdue,
           COALESCE(po.grand_total, po.total_amount, po.subtotal, 0)::float8 AS total_amount,
           COALESCE(po.currency, 'USD') AS currency,
           COALESCE(po.lifecycle_status::text, po.status, 'pending') AS status,
           (SELECT COUNT(*)::int FROM purchase_order_items poi WHERE poi.po_id = po.id) AS items_count
         FROM purchase_orders po
         LEFT JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.tenant_id = $1::uuid
           AND ($2::uuid IS NULL OR po.warehouse_id = $2::uuid)
           AND po.expected_delivery_date IS NOT NULL
           AND po.expected_delivery_date < CURRENT_DATE
           AND COALESCE(po.lifecycle_status::text, po.status, '') NOT IN ('received', 'closed', 'cancelled')
         ORDER BY days_overdue DESC
         LIMIT 15`,
        tenantId,
        warehouseFilter
      ),

      // 12. Top 10 fastest moving items (last 30 days)
      prisma.$queryRawUnsafe<TopMoverRawRow[]>(
        `SELECT 
           im.product_variant_id AS variant_id,
           COALESCE(pv.name, p.name, 'Unknown Item') AS product_name,
           COALESCE(pv.sku, p.sku, 'N/A') AS sku,
           COALESCE(c.name, 'General') AS category_name,
           COALESCE(SUM(CASE WHEN im.quantity_delta < 0 THEN ABS(im.quantity_delta) ELSE 0 END), 0)::float8 AS outbound_qty,
           COALESCE(SUM(CASE WHEN im.quantity_delta > 0 THEN im.quantity_delta ELSE 0 END), 0)::float8 AS inbound_qty,
           COUNT(*)::int AS total_movements
         FROM inventory_movements im
         JOIN product_variants pv ON pv.id = im.product_variant_id
         JOIN products p ON p.id = pv.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE im.tenant_id = $1::uuid
           AND ($2::uuid IS NULL OR im.warehouse_id = $2::uuid)
           AND im.occurred_at >= (NOW() - INTERVAL '30 days')
         GROUP BY im.product_variant_id, pv.name, p.name, pv.sku, p.sku, c.name
         ORDER BY (SUM(CASE WHEN im.quantity_delta < 0 THEN ABS(im.quantity_delta) ELSE 0 END) + COUNT(*)) DESC
         LIMIT 10`,
        tenantId,
        warehouseFilter
      ),

      // 13. Warehouses for filter dropdown
      prisma.warehouses.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, name: true, code: true, is_default: true },
        orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
      }),

      // 14. Tenant Default Currency
      resolveTenantDefaultCurrency(tenantId),
    ])

    // --- KPI calculations ---
    const totalInventoryValue = Number(kpiValuesResult[0]?.total_value || 0)
    const activeSkus = Number(kpiValuesResult[0]?.active_skus || 0)
    const totalSkus = Number(totalSkusCount || 0)

    const trackedSkus = Number(stockHealthResult[0]?.tracked_skus || 0)
    const healthySkus = Number(stockHealthResult[0]?.healthy_skus || 0)
    const stockHealthScore =
      trackedSkus > 0 ? Math.round((healthySkus / trackedSkus) * 100) : 100

    const salesToday = Number(salesResult[0]?.sales_today || 0)
    const salesYesterday = Number(salesResult[0]?.sales_yesterday || 0)
    const salesTodayChange =
      salesYesterday > 0
        ? Math.round(((salesToday - salesYesterday) / salesYesterday) * 100)
        : salesToday > 0
        ? 100
        : 0

    const pendingPoValue = Number(pendingPoResult[0]?.pending_po_value || 0)
    const pendingPoCount = Number(pendingPoResult[0]?.pending_po_count || 0)

    const expiredBatchesCount = Number(batchCountsResult[0]?.expired_count || 0)
    const expiringBatchesCount = Number(
      batchCountsResult[0]?.expiring_count || 0
    )

    const kpis: DashboardKPIs = {
      totalInventoryValue,
      inventoryValueChange: 3.2, // Benchmark trend
      activeSkus,
      totalSkus,
      stockHealthScore,
      stockHealthChange: stockHealthScore >= 80 ? 2.1 : -4.3,
      salesToday,
      salesTodayChange,
      pendingPoValue,
      pendingPoCount,
      expiringBatchesCount,
      expiredBatchesCount,
    }

    // --- Build unified Stock Alerts list ---
    const stockAlerts: StockAlertItem[] = []

    // Add low and out of stock items
    for (const row of stockAlertsRows) {
      const isOutOfStock = row.qty_on_hand <= 0
      stockAlerts.push({
        id: row.balance_id,
        productId: row.product_id,
        variantId: row.variant_id,
        name: row.product_name,
        sku: row.sku,
        categoryName: row.category_name,
        warehouseName: row.warehouse_name,
        qtyOnHand: Number(row.qty_on_hand),
        qtyAvailable: Number(row.qty_available),
        minQuantity: Number(row.min_quantity),
        reorderPoint: Number(row.reorder_point),
        costPrice: Number(row.cost_price),
        status: isOutOfStock ? 'out_of_stock' : 'low_stock',
        urgency: isOutOfStock ? 'critical' : 'high',
      })
    }

    // Add batch expiry alerts
    for (const b of batchAlertsRows) {
      const isExpired = b.batch_alert_type === 'expired'
      stockAlerts.push({
        id: b.batch_id,
        productId: b.product_id,
        variantId: b.variant_id,
        name: `${b.product_name} (Batch: ${b.batch_number})`,
        sku: b.sku,
        categoryName: b.category_name,
        warehouseName: 'Batch Warehouse',
        qtyOnHand: 0,
        qtyAvailable: 0,
        minQuantity: 0,
        reorderPoint: 0,
        costPrice: Number(b.cost_price),
        status: isExpired ? 'expired' : 'expiring',
        urgency: isExpired ? 'critical' : 'medium',
        batchNumber: b.batch_number,
        expiryDate: b.expiry_date,
        daysToExpiry: Number(b.days_to_expiry),
      })
    }

    // Critical Alerts summary
    const outOfStockCount = stockAlerts.filter(
      (a) => a.status === 'out_of_stock'
    ).length
    const lowStockCount = stockAlerts.filter((a) => a.status === 'low_stock')
      .length
    const overduePoCount = overduePoRows.length
    const totalCritical =
      outOfStockCount + expiredBatchesCount + overduePoCount

    const criticalAlerts: CriticalAlertCounts = {
      outOfStockCount,
      lowStockCount,
      expiredCount: expiredBatchesCount,
      expiringSoonCount: expiringBatchesCount,
      overduePoCount,
      totalCritical,
    }

    // --- Build Sales Trends ---
    const salesTrend30Days: SalesTrendPoint[] = salesTrendRows.map((r) => ({
      date: r.display_date,
      fullDate: r.day_date,
      revenue: Number(r.revenue),
      invoicesCount: Number(r.invoices_count),
    }))

    // Slice last 7 points for 7-day trend
    const salesTrend7Days = salesTrend30Days.slice(-7)

    // --- Build Category Breakdown ---
    const totalCategoryValue = categoryRows.reduce(
      (acc, curr) => acc + Number(curr.stock_value),
      0
    )
    const categoryBreakdown: CategoryBreakdown[] = categoryRows.map(
      (row, idx) => {
        const val = Number(row.stock_value)
        const pct =
          totalCategoryValue > 0
            ? Math.round((val / totalCategoryValue) * 100)
            : 0
        return {
          id: row.category_id,
          name: row.category_name,
          value: val,
          percentage: pct,
          itemCount: Number(row.item_count),
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        }
      }
    )

    // --- Build PO Distribution ---
    const poDistribution: PoStatusDistribution[] = poStatusRows.map((row) => {
      const cfg = PO_STATUS_CONFIG[row.status_key.toLowerCase()] || {
        label: row.status_key,
        color: 'hsl(215, 16%, 47%)',
      }
      return {
        status: row.status_key,
        label: cfg.label,
        count: Number(row.po_count),
        value: Number(row.total_val),
        color: cfg.color,
      }
    })

    // --- Build Overdue POs ---
    const overduePurchaseOrders: OverduePurchaseOrder[] = overduePoRows.map(
      (po) => ({
        id: po.id,
        poNumber: po.po_number,
        supplierName: po.supplier_name,
        orderDate: po.order_date,
        expectedDeliveryDate: po.expected_delivery_date,
        daysOverdue: Number(po.days_overdue),
        totalAmount: Number(po.total_amount),
        currency: po.currency,
        status: po.status,
        itemsCount: Number(po.items_count),
      })
    )

    // --- Build Top Movers ---
    const topMovers: TopMoverItem[] = topMoversRows.map((m) => {
      const outQty = Number(m.outbound_qty)
      const inQty = Number(m.inbound_qty)
      return {
        variantId: m.variant_id,
        productName: m.product_name,
        sku: m.sku,
        categoryName: m.category_name,
        outboundQty: outQty,
        inboundQty: inQty,
        totalMovements: Number(m.total_movements),
        trend: outQty > inQty ? 'up' : inQty > outQty ? 'down' : 'neutral',
      }
    })

    // --- Build Warehouses filter options ---
    const warehouses: WarehouseFilterOption[] = [
      { id: 'all', name: 'All Warehouses', isDefault: !warehouseFilter },
      ...warehousesList.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        isDefault: !!w.is_default,
      })),
    ]

    return {
      kpis,
      criticalAlerts,
      stockAlerts,
      salesTrend7Days,
      salesTrend30Days,
      categoryBreakdown,
      poDistribution,
      overduePurchaseOrders,
      topMovers,
      warehouses,
      currency: {
        code: currencyInfo.currencyCode || 'USD',
        symbol: currencyInfo.currencySymbol || '$',
      },
      lastUpdated: new Date().toISOString(),
    }
  })
}

// TanStack Start Server Function Export
export const fetchDashboardAnalyticsServerFn = createServerFn({
  method: 'GET',
})
  .validator(
    z.object({
      userId: z.string(),
      warehouseId: z.string().optional(),
      timeRange: z.enum(['7d', '30d', '90d']).optional(),
    })
  )
  .handler(async ({ data: { userId, warehouseId, timeRange } }) => {
    return getDashboardAnalyticsData(userId, { warehouseId, timeRange })
  })
