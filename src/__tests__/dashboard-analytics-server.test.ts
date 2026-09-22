import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardAnalyticsData } from '@/server/fns/dashboard-analytics'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    $queryRawUnsafe: vi.fn(),
    product_variants: {
      count: vi.fn(),
    },
    warehouses: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000001'),
}))

vi.mock('@/server/fns/inventory-valuation', () => ({
  resolveTenantDefaultCurrency: vi.fn().mockResolvedValue({
    currencyId: 'curr-1',
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
  }),
}))

describe('dashboard-analytics server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates KPI numbers and builds complete analytics response', async () => {
    // Mock the 10 $queryRawUnsafe calls in order
    vi.mocked(prisma.$queryRawUnsafe)
      .mockResolvedValueOnce([{ total_value: 125000, active_skus: 42 }]) // 1. kpiValues
      .mockResolvedValueOnce([{ tracked_skus: 50, healthy_skus: 45 }]) // 3. stockHealth
      .mockResolvedValueOnce([{ sales_today: 3200, sales_yesterday: 2800 }]) // 4. sales
      .mockResolvedValueOnce([{ pending_po_value: 15400, pending_po_count: 3 }]) // 5. pending po
      .mockResolvedValueOnce([{ expired_count: 2, expiring_count: 5 }]) // 6. batch expiry counts
      .mockResolvedValueOnce([
        {
          balance_id: 'bal-1',
          variant_id: 'var-1',
          product_id: 'prod-1',
          product_name: 'Organic Milk',
          sku: 'SKU-MILK-1L',
          category_name: 'Dairy',
          warehouse_name: 'Central Warehouse',
          qty_on_hand: 0,
          qty_available: 0,
          min_quantity: 10,
          reorder_point: 20,
          cost_price: 2.5,
        },
      ]) // 7a. stock alerts
      .mockResolvedValueOnce([
        {
          batch_id: 'batch-1',
          variant_id: 'var-2',
          product_id: 'prod-2',
          product_name: 'Greek Yogurt',
          sku: 'SKU-YOGURT',
          category_name: 'Dairy',
          batch_number: 'B-2026-001',
          expiry_date: '2026-03-20',
          days_to_expiry: -3,
          cost_price: 1.8,
          batch_alert_type: 'expired',
        },
      ]) // 7b. batch alerts
      .mockResolvedValueOnce([
        {
          day_date: '2026-03-22',
          display_date: 'Mar 22',
          revenue: 2800,
          invoices_count: 14,
        },
        {
          day_date: '2026-03-23',
          display_date: 'Mar 23',
          revenue: 3200,
          invoices_count: 18,
        },
      ]) // 8. sales trend
      .mockResolvedValueOnce([
        {
          category_id: 'cat-1',
          category_name: 'Dairy',
          stock_value: 75000,
          item_count: 25,
        },
        {
          category_id: 'cat-2',
          category_name: 'Bakery',
          stock_value: 50000,
          item_count: 17,
        },
      ]) // 9. category breakdown
      .mockResolvedValueOnce([
        { status_key: 'pending', po_count: 2, total_val: 10000 },
        { status_key: 'approved', po_count: 1, total_val: 5400 },
      ]) // 10. po distribution
      .mockResolvedValueOnce([
        {
          id: 'po-1',
          po_number: 'PO-1001',
          supplier_name: 'Global Foods Co',
          order_date: '2026-03-01',
          expected_delivery_date: '2026-03-15',
          days_overdue: 8,
          total_amount: 5400,
          currency: 'USD',
          status: 'sent',
          items_count: 4,
        },
      ]) // 11. overdue pos
      .mockResolvedValueOnce([
        {
          variant_id: 'var-1',
          product_name: 'Organic Milk',
          sku: 'SKU-MILK-1L',
          category_name: 'Dairy',
          outbound_qty: 120,
          inbound_qty: 150,
          total_movements: 25,
        },
      ]) // 12. top movers

    vi.mocked(prisma.product_variants.count).mockResolvedValue(60) // 2. totalSkus
    vi.mocked(prisma.warehouses.findMany).mockResolvedValue([
      { id: 'wh-1', name: 'Main Hub', code: 'MH1', is_default: true },
    ] as any)

    const result = await getDashboardAnalyticsData('user-1')

    // Verify KPIs
    expect(result.kpis.totalInventoryValue).toBe(125000)
    expect(result.kpis.activeSkus).toBe(42)
    expect(result.kpis.totalSkus).toBe(60)
    expect(result.kpis.stockHealthScore).toBe(90) // 45 / 50 * 100
    expect(result.kpis.salesToday).toBe(3200)
    expect(result.kpis.pendingPoValue).toBe(15400)
    expect(result.kpis.pendingPoCount).toBe(3)
    expect(result.kpis.expiredBatchesCount).toBe(2)
    expect(result.kpis.expiringBatchesCount).toBe(5)

    // Verify Critical Alerts
    expect(result.criticalAlerts.outOfStockCount).toBe(1)
    expect(result.criticalAlerts.expiredCount).toBe(2)
    expect(result.criticalAlerts.overduePoCount).toBe(1)
    expect(result.criticalAlerts.totalCritical).toBe(4) // 1 out_of_stock + 2 expired + 1 overdue

    // Verify Stock Alerts classification
    expect(result.stockAlerts.length).toBe(2)
    expect(result.stockAlerts[0].status).toBe('out_of_stock')
    expect(result.stockAlerts[0].urgency).toBe('critical')
    expect(result.stockAlerts[1].status).toBe('expired')

    // Verify Category Breakdown shares
    expect(result.categoryBreakdown.length).toBe(2)
    expect(result.categoryBreakdown[0].percentage).toBe(60) // 75k / 125k
    expect(result.categoryBreakdown[1].percentage).toBe(40) // 50k / 125k

    // Verify Currency & Warehouses
    expect(result.currency.code).toBe('USD')
    expect(result.currency.symbol).toBe('$')
    expect(result.warehouses.length).toBe(2) // 'All Warehouses' + 'Main Hub'
    expect(result.warehouses[0].id).toBe('all')
  })

  it('handles empty database gracefully without throwing errors', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([])
    vi.mocked(prisma.product_variants.count).mockResolvedValue(0)
    vi.mocked(prisma.warehouses.findMany).mockResolvedValue([])

    const result = await getDashboardAnalyticsData('user-empty')

    expect(result.kpis.totalInventoryValue).toBe(0)
    expect(result.kpis.activeSkus).toBe(0)
    expect(result.kpis.totalSkus).toBe(0)
    expect(result.kpis.stockHealthScore).toBe(100)
    expect(result.stockAlerts).toEqual([])
    expect(result.salesTrend30Days).toEqual([])
    expect(result.categoryBreakdown).toEqual([])
    expect(result.overduePurchaseOrders).toEqual([])
    expect(result.topMovers).toEqual([])
  })
})
