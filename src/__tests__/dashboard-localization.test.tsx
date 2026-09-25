import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import i18n from '@/config/i18n'
import enTranslation from '@/assets/i18n/en.json'
import arTranslation from '@/assets/i18n/ar.json'
import { CommandCenterHeader } from '@/features/dashboard/components/command-center-header'
import { CriticalAlertsBar } from '@/features/dashboard/components/critical-alerts-bar'
import { KpiGrid } from '@/features/dashboard/components/kpi-grid'
import { SalesTrendChart } from '@/features/dashboard/components/sales-trend-chart'
import { CategoryDonutChart } from '@/features/dashboard/components/category-donut-chart'
import { StockAlertsTable } from '@/features/dashboard/components/stock-alerts-table'
import { OverduePoTable } from '@/features/dashboard/components/overdue-po-table'
import { TopMoversList } from '@/features/dashboard/components/top-movers-list'
import { EmptyDashboard } from '@/features/dashboard/components/empty-dashboard'
import type {
  CriticalAlertCounts,
  DashboardKPIs,
  DashboardCurrency,
  StockAlertItem,
  OverduePurchaseOrder,
  TopMoverItem,
  SalesTrendPoint,
  CategoryBreakdown,
  WarehouseFilterOption,
} from '@/features/dashboard/types'

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts')
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 500, height: 300 }}>{children}</div>,
  }
})

describe('Dashboard Module i18n / Localization', () => {
  const mockCurrency: DashboardCurrency = {
    code: 'USD',
    symbol: '$',
  }

  const mockWarehouses: WarehouseFilterOption[] = [
    { id: 'all', name: 'All Warehouses' },
    { id: 'wh-1', name: 'Main Depot', code: 'MAIN' },
  ]

  const mockAlerts: CriticalAlertCounts = {
    outOfStockCount: 3,
    lowStockCount: 5,
    expiredCount: 2,
    expiringSoonCount: 4,
    overduePoCount: 1,
    totalCritical: 11,
  }

  const mockKpis: DashboardKPIs = {
    totalInventoryValue: 125430.5,
    inventoryValueChange: 4.2,
    activeSkus: 1420,
    totalSkus: 1500,
    stockHealthScore: 88,
    stockHealthChange: 1.5,
    salesToday: 4520.0,
    salesTodayChange: 12.5,
    pendingPoValue: 18200.0,
    pendingPoCount: 3,
    expiringBatchesCount: 4,
    expiredBatchesCount: 2,
  }

  const mockStockAlertItems: StockAlertItem[] = [
    {
      id: 'item-1',
      productId: 'p-1',
      variantId: 'v-1',
      name: 'Organic Milk 1L',
      sku: 'MILK-001',
      categoryName: 'Dairy',
      warehouseName: 'Main Warehouse',
      qtyOnHand: 0,
      qtyAvailable: 0,
      minQuantity: 10,
      reorderPoint: 15,
      costPrice: 2.5,
      urgency: 'critical',
      status: 'out_of_stock',
    },
    {
      id: 'item-2',
      productId: 'p-2',
      variantId: 'v-2',
      name: 'Cheddar Cheese 200g',
      sku: 'CHZ-002',
      categoryName: 'Dairy',
      warehouseName: 'Main Warehouse',
      qtyOnHand: 4,
      qtyAvailable: 4,
      minQuantity: 15,
      reorderPoint: 20,
      costPrice: 4.0,
      urgency: 'high',
      status: 'low_stock',
    },
  ]

  const mockOverduePOs: OverduePurchaseOrder[] = [
    {
      id: 'po-1',
      poNumber: 'PO-2026-001',
      supplierName: 'Acme Dairy Supplies',
      orderDate: '2026-03-01',
      expectedDeliveryDate: '2026-03-10',
      daysOverdue: 15,
      totalAmount: 12500,
      currency: '$',
      status: 'confirmed',
      itemsCount: 8,
    },
  ]

  const mockMovers: TopMoverItem[] = [
    {
      variantId: 'v-1',
      productName: 'Organic Whole Milk',
      sku: 'MILK-001',
      categoryName: 'Dairy',
      outboundQty: 450,
      inboundQty: 500,
      totalMovements: 42,
      trend: 'up',
    },
  ]

  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en')
    })
  })

  it('contains all dashboard dictionary entries in both en.json and ar.json', () => {
    const enDashboard = (enTranslation as any).dashboard
    const arDashboard = (arTranslation as any).dashboard

    expect(enDashboard).toBeDefined()
    expect(arDashboard).toBeDefined()

    const sections = [
      'commandCenter',
      'alerts',
      'kpis',
      'salesPerformance',
      'categoryDistribution',
      'stockAlerts',
      'delayedPOs',
      'topMovers',
      'emptyState',
      'navigation',
      'errors',
      'sideTabs',
    ]

    for (const sec of sections) {
      expect(enDashboard[sec], `en.json missing dashboard.${sec}`).toBeDefined()
      expect(arDashboard[sec], `ar.json missing dashboard.${sec}`).toBeDefined()

      const enKeys = Object.keys(enDashboard[sec])
      const arKeys = Object.keys(arDashboard[sec])

      expect(arKeys, `ar.json dashboard.${sec} keys match en.json`).toEqual(
        expect.arrayContaining(enKeys)
      )
    }
  })

  it('renders CommandCenterHeader in English and Arabic', async () => {
    const { rerender } = render(
      <CommandCenterHeader
        warehouses={mockWarehouses}
        selectedWarehouseId='all'
        onWarehouseChange={() => {}}
        timeRange='30d'
        onTimeRangeChange={() => {}}
        onRefresh={() => {}}
        isRefetching={false}
      />
    )

    expect(screen.getByText('Command Center')).toBeInTheDocument()
    expect(screen.getByText('Sync Data')).toBeInTheDocument()
    expect(screen.getByText('New PO')).toBeInTheDocument()
    expect(screen.getByText('Valuation Report')).toBeInTheDocument()

    // Switch to Arabic
    await act(async () => {
      await i18n.changeLanguage('ar')
    })
    rerender(
      <CommandCenterHeader
        warehouses={mockWarehouses}
        selectedWarehouseId='all'
        onWarehouseChange={() => {}}
        timeRange='30d'
        onTimeRangeChange={() => {}}
        onRefresh={() => {}}
        isRefetching={false}
      />
    )

    expect(screen.getByText('مركز القيادة')).toBeInTheDocument()
    expect(screen.getByText('مزامنة البيانات')).toBeInTheDocument()
    expect(screen.getByText('أمر شراء جديد')).toBeInTheDocument()
    expect(screen.getByText('تقرير التقييم')).toBeInTheDocument()
  })

  it('renders CriticalAlertsBar in English and Arabic', async () => {
    const { rerender } = render(<CriticalAlertsBar alerts={mockAlerts} />)

    expect(screen.getByText(/3 Out of Stock/i)).toBeInTheDocument()
    expect(screen.getByText(/5 Low Stock/i)).toBeInTheDocument()
    expect(screen.getByText(/2 Batches Expired/i)).toBeInTheDocument()

    // Switch to Arabic
    await act(async () => {
      await i18n.changeLanguage('ar')
    })
    rerender(<CriticalAlertsBar alerts={mockAlerts} />)

    expect(screen.getByText(/3 نفد من المخزون/i)).toBeInTheDocument()
    expect(screen.getByText(/5 منخفض المخزون/i)).toBeInTheDocument()
    expect(screen.getByText(/2 دفعات منتهية الصلاحية/i)).toBeInTheDocument()
  })

  it('renders KpiGrid in English and Arabic', async () => {
    const { rerender } = render(<KpiGrid kpis={mockKpis} currency={mockCurrency} />)

    expect(screen.getByText('Inventory Value')).toBeInTheDocument()
    expect(screen.getByText('Active SKUs')).toBeInTheDocument()
    expect(screen.getByText('Stock Health')).toBeInTheDocument()

    // Switch to Arabic
    await act(async () => {
      await i18n.changeLanguage('ar')
    })
    rerender(<KpiGrid kpis={mockKpis} currency={mockCurrency} />)

    expect(screen.getByText('قيمة المخزون')).toBeInTheDocument()
    expect(screen.getByText('وحدات SKU النشطة')).toBeInTheDocument()
    expect(screen.getByText('صحة المخزون')).toBeInTheDocument()
  })

  it('renders EmptyDashboard in English and Arabic', async () => {
    const { rerender } = render(<EmptyDashboard />)

    expect(screen.getByText('Welcome to your Inventory Command Center')).toBeInTheDocument()
    expect(screen.getByText('1. Add Products')).toBeInTheDocument()
    expect(screen.getByText('2. Purchase Orders')).toBeInTheDocument()
    expect(screen.getByText('3. Initial Stock')).toBeInTheDocument()

    // Switch to Arabic
    await act(async () => {
      await i18n.changeLanguage('ar')
    })
    rerender(<EmptyDashboard />)

    expect(screen.getByText('مرحباً بك في مركز قيادة المخزون')).toBeInTheDocument()
    expect(screen.getByText('1. إضافة منتجات')).toBeInTheDocument()
    expect(screen.getByText('2. أوامر الشراء')).toBeInTheDocument()
    expect(screen.getByText('3. المخزون الافتتاحي')).toBeInTheDocument()
  })

  it('renders OverduePoTable and TopMoversList in English and Arabic', async () => {
    const { rerender } = render(
      <div>
        <OverduePoTable orders={mockOverduePOs} currency={mockCurrency} />
        <TopMoversList movers={mockMovers} />
      </div>
    )

    expect(screen.getByText('Delayed Supplier Deliveries')).toBeInTheDocument()
    expect(screen.getByText('Velocity & Top Movers')).toBeInTheDocument()
    expect(screen.getByText(/42 operations/i)).toBeInTheDocument()

    // Switch to Arabic
    await act(async () => {
      await i18n.changeLanguage('ar')
    })
    rerender(
      <div>
        <OverduePoTable orders={mockOverduePOs} currency={mockCurrency} />
        <TopMoversList movers={mockMovers} />
      </div>
    )

    expect(screen.getByText('شحنات الموردين المتأخرة')).toBeInTheDocument()
    expect(screen.getByText('سرعة الدوران والأكثر حركة')).toBeInTheDocument()
    expect(screen.getByText(/42 عملية/i)).toBeInTheDocument()
  })
})
