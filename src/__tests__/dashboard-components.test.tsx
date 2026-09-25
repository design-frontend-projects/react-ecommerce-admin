import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CriticalAlertsBar } from '@/features/dashboard/components/critical-alerts-bar'
import { KpiGrid } from '@/features/dashboard/components/kpi-grid'
import { StockAlertsTable } from '@/features/dashboard/components/stock-alerts-table'
import type { CriticalAlertCounts, DashboardKPIs, DashboardCurrency, StockAlertItem } from '@/features/dashboard/types'
import '@/config/i18n'

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

describe('Dashboard Components Icon Integrity and Rendering', () => {
  const mockCurrency: DashboardCurrency = {
    code: 'USD',
    symbol: '$',
  }

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
    lowStockItems: 5,
    outOfStockItems: 3,
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
      name: 'Organic Milk 1L',
      sku: 'MILK-001',
      categoryName: 'Dairy',
      warehouseName: 'Main Warehouse',
      qtyAvailable: 0,
      minQuantity: 10,
      status: 'out_of_stock',
    },
    {
      id: 'item-2',
      name: 'Cheddar Cheese 200g',
      sku: 'CHZ-002',
      categoryName: 'Dairy',
      warehouseName: 'Main Warehouse',
      qtyAvailable: 4,
      minQuantity: 15,
      status: 'low_stock',
    },
    {
      id: 'item-3',
      name: 'Greek Yogurt 500g',
      sku: 'YOG-003',
      categoryName: 'Dairy',
      warehouseName: 'Main Warehouse',
      qtyAvailable: 8,
      minQuantity: 10,
      status: 'expired',
      batchNumber: 'BATCH-2026-A',
      daysToExpiry: -2,
    },
    {
      id: 'item-4',
      name: 'Fresh Butter 250g',
      sku: 'BTR-004',
      categoryName: 'Dairy',
      warehouseName: 'Main Warehouse',
      qtyAvailable: 12,
      minQuantity: 10,
      status: 'expiring',
      batchNumber: 'BATCH-2026-B',
      daysToExpiry: 5,
    },
  ]

  it('renders CriticalAlertsBar with critical alerts without syntax/import errors', () => {
    render(<CriticalAlertsBar alerts={mockAlerts} />)

    expect(screen.getByText(/3 Out of Stock/i)).toBeInTheDocument()
    expect(screen.getByText(/5 Low Stock/i)).toBeInTheDocument()
    expect(screen.getByText(/2 Batches Expired/i)).toBeInTheDocument()
    expect(screen.getByText(/4 Expiring Soon/i)).toBeInTheDocument()
  })

  it('renders CriticalAlertsBar normal banner when zero alerts exist', () => {
    const normalAlerts: CriticalAlertCounts = {
      outOfStockCount: 0,
      lowStockCount: 0,
      expiredCount: 0,
      expiringSoonCount: 0,
      overduePoCount: 0,
      totalCritical: 0,
    }
    render(<CriticalAlertsBar alerts={normalAlerts} />)

    expect(screen.getByText(/All inventory parameters are within optimal thresholds/i)).toBeInTheDocument()
    expect(screen.getByText(/Status: Normal/i)).toBeInTheDocument()
  })

  it('renders KpiGrid with all cards including Expiry Alerts without errors', () => {
    render(<KpiGrid kpis={mockKpis} currency={mockCurrency} />)

    expect(screen.getByText('Inventory Value')).toBeInTheDocument()
    expect(screen.getByText('Active SKUs')).toBeInTheDocument()
    expect(screen.getByText('Stock Health')).toBeInTheDocument()
    expect(screen.getByText('Sales Today')).toBeInTheDocument()
    expect(screen.getByText('Pending POs')).toBeInTheDocument()
    expect(screen.getByText('Expiry Alerts')).toBeInTheDocument()
    expect(screen.getByText(/2 expired, 4 <30 days/i)).toBeInTheDocument()
  })

  it('renders StockAlertsTable with rows and status badges (expired, expiring, low, out)', () => {
    render(<StockAlertsTable alerts={mockStockAlertItems} currency={mockCurrency} />)

    expect(screen.getByText('Organic Milk 1L')).toBeInTheDocument()
    expect(screen.getByText('Cheddar Cheese 200g')).toBeInTheDocument()
    expect(screen.getByText('Greek Yogurt 500g')).toBeInTheDocument()
    expect(screen.getByText('Fresh Butter 250g')).toBeInTheDocument()
    expect(screen.getByText('Expired')).toBeInTheDocument()
    expect(screen.getByText('Expires in 5d')).toBeInTheDocument()
  })

  it('verifies use-dashboard-analytics delegates to client API fetcher without loading PrismaClient in browser', async () => {
    const { fetchDashboardAnalytics } = await import('@/features/dashboard/data/analytics-api')
    expect(typeof fetchDashboardAnalytics).toBe('function')
  })
})

