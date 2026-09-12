import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Boxes,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  PackageCheck,
  ShieldAlert,
  ArrowUpRight,
  Warehouse,
  History,
  ClipboardCheck,
  FileSpreadsheet,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { StatusBadge } from '@/components/shared/status-badge'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

interface VariantProductData {
  id: string
  sku?: string | null
  price_list_items?: Array<{
    price?: number | string | null
    cost_price?: number | string | null
  }> | null
  products?: {
    name?: string | null
    category_id?: number | null
    categories?: {
      name?: string | null
    } | null
  } | null
}

interface PendingTransferRow {
  id: string
  status: string
  created_at: string
  from_store?: { name?: string | null } | null
  to_store?: { name?: string | null } | null
}

export function InventoryDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)

  // Fetch Inventory Dashboard Analytics
  const { data: dashboardData } = useQuery({
    queryKey: ['inventory-dashboard-metrics', user?.id],
    queryFn: async () => {
      // 1. Fetch stock balances with warehouse data
      const { data: balances } = await supabase
        .from('stock_balances')
        .select('qty_on_hand, qty_reserved, qty_available, avg_cost, product_variant_id, store_id, stores(name), warehouse_id, warehouses(name, code)')

      // 2. Fetch variants & prices
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, sku, products(name, category_id, categories(name)), price_list_items(price, cost_price)')

      // 3. Fetch expiring batches
      const now = new Date()
      const in30Days = new Date()
      in30Days.setDate(now.getDate() + 30)

      const { data: batches } = await supabase
        .from('product_batches')
        .select('id, batch_number, expiry_date, status')

      // 4. Fetch pending transfers & counts
      const { data: pendingTransfers } = await supabase
        .from('stock_transfers')
        .select('id, status, created_at, from_store:stores!from_store_id(name), to_store:stores!to_store_id(name)')
        .in('status', ['draft', 'requested', 'in_transit'])
        .limit(5)

      // 5. Recent movements
      const { data: movements } = await supabase
        .from('inventory_movements')
        .select('id, movement_type, qty, movement_date')
        .order('movement_date', { ascending: false })
        .limit(6)

      const variantMap = new Map<string, VariantProductData>(
        ((variants as VariantProductData[]) || []).map((v) => [v.id, v])
      )

      let totalOnHand = 0
      let totalReserved = 0
      let totalAvailable = 0
      let totalAssetValue = 0
      let outOfStockCount = 0
      let lowStockCount = 0

      const warehouseMap: Record<string, { name: string; value: number; units: number }> = {}
      const categoryMap: Record<string, number> = {}

      for (const b of balances || []) {
        const onHand = Number(b.qty_on_hand || 0)
        const reserved = Number(b.qty_reserved || 0)
        const available = Number(b.qty_available || 0)
        const v = variantMap.get(b.product_variant_id)
        const pli = v?.price_list_items?.[0]
        const cost = Number(b.avg_cost ?? pli?.cost_price ?? pli?.price ?? 0)

        totalOnHand += onHand
        totalReserved += reserved
        totalAvailable += available
        totalAssetValue += onHand * cost

        if (onHand <= 0) {
          outOfStockCount++
        } else if (onHand < 10) {
          lowStockCount++
        }

        const wh = b.warehouses as { name?: string; code?: string } | null
        const whName = wh?.name || wh?.code || (b.stores as { name?: string })?.name || 'Default Warehouse'
        if (!warehouseMap[whName]) {
          warehouseMap[whName] = { name: whName, value: 0, units: 0 }
        }
        warehouseMap[whName].value += onHand * cost
        warehouseMap[whName].units += onHand

        const catName = v?.products?.categories?.name || 'Uncategorized'
        categoryMap[catName] = (categoryMap[catName] || 0) + onHand * cost
      }

      let expiringCount = 0
      let expiredCount = 0
      for (const batch of batches || []) {
        if (!batch.expiry_date) continue
        const exp = new Date(batch.expiry_date)
        if (exp < now) {
          expiredCount++
        } else if (exp <= in30Days) {
          expiringCount++
        }
      }

      const warehouseChart = Object.values(warehouseMap)
      const categoryChart = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value: Math.round(value),
      }))

      return {
        totalOnHand,
        totalReserved,
        totalAvailable,
        totalAssetValue,
        outOfStockCount,
        lowStockCount,
        expiringCount,
        expiredCount,
        warehouseChart,
        categoryChart,
        pendingTransfers: (pendingTransfers as PendingTransferRow[]) || [],
        recentMovements: movements || [],
      }
    },
    staleTime: 60000,
  })

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('inventory.dashboard.title', 'Inventory Command Center')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.dashboard.description', 'Real-time stock valuation, warehouse distribution, movements, and alerts.')}
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/stock-transfers' })}
            className="text-xs gap-1.5"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />
            {t('inventory.dashboard.transfers', 'Transfers')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/stock-adjustments' })}
            className="text-xs gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
            {t('stockBalances.buttons.newAdjustment', 'Adjustments')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/inventory/expiry' })}
            className="text-xs gap-1.5"
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            {t('inventory.dashboard.expiry', 'Expiry Tracker')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/inventory/ledger' })}
            className="text-xs gap-1.5"
          >
            <History className="h-3.5 w-3.5 text-purple-500" />
            {t('inventory.dashboard.ledger', 'Stock Ledger')}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Value */}
        <Card className="shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('inventory.dashboard.assetValuation', 'Total Stock Valuation')}
              </p>
              <p className="text-2xl font-bold text-foreground">
                ${(dashboardData?.totalAssetValue || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {(dashboardData?.totalOnHand || 0).toLocaleString()} {t('inventory.dashboard.totalOnHand', 'Total Units in Hand')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Boxes className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Available vs Reserved */}
        <Card className="shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('inventory.dashboard.availableUnits', 'Available')} / {t('inventory.dashboard.reservedUnits', 'Reserved')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {(dashboardData?.totalAvailable || 0).toLocaleString()}
                </p>
                <span className="text-xs text-muted-foreground">
                  / {(dashboardData?.totalReserved || 0).toLocaleString()} Res
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('inventory.dashboard.availableUnits', 'Ready for sales & fulfillment')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Low Stock & Out of Stock */}
        <Card className="shadow-xs border-amber-200/50 dark:border-amber-900/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('inventory.dashboard.lowStock', 'Low Stock Items')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {dashboardData?.lowStockCount || 0}
                </p>
                <span className="text-xs text-rose-500 font-semibold">
                  ({dashboardData?.outOfStockCount || 0} {t('inventory.status.outOfStock', 'OOS')})
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('inventory.alertsPage.suggestedAction', 'Requires reorder action')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Expiry Risk Alerts */}
        <Card className="shadow-xs border-rose-200/50 dark:border-rose-900/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('inventory.dashboard.expiringSoon', 'Batches Expiry Risk')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {dashboardData?.expiringCount || 0}
                </p>
                <span className="text-xs text-muted-foreground">
                  &lt;30d ({dashboardData?.expiredCount || 0} {t('inventory.dashboard.expired', 'Expired')})
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">FIFO write-off / discount</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Valuation by Location/Warehouse */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" />
              {t('inventory.dashboard.warehouseDistribution', 'Stock Valuation by Store & Warehouse')}
            </CardTitle>
            <CardDescription className="text-xs">
              Total monetary inventory value held across active store locations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full">
              {dashboardData?.warehouseChart?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.warehouseChart} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                    <Tooltip
                      formatter={(val: unknown) => [`$${Number(val || 0).toLocaleString()}`, 'Valuation']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No warehouse distribution data recorded.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown (Donut/Pie) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">
              {t('inventory.dashboard.categoryBreakdown', 'Category Distribution')}
            </CardTitle>
            <CardDescription className="text-xs">
              Valuation share by product category.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[280px] w-full flex items-center justify-center">
              {dashboardData?.categoryChart?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.categoryChart}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {dashboardData.categoryChart.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`$${Number(val || 0).toLocaleString()}`, 'Value']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-muted-foreground">No category data.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transfers & Recent Movements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Transfers Tracker */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">
                {t('inventory.dashboard.pendingTransfers', 'Pending Stock Transfers')}
              </CardTitle>
              <CardDescription className="text-xs">
                In-transit and unapproved transfer requests.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/stock-transfers' })}
              className="text-xs h-8"
            >
              {t('inventory.dashboard.viewAll', 'View All')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {dashboardData?.pendingTransfers?.length ? (
                dashboardData.pendingTransfers.map((tr) => (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-xs hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">
                        {tr.from_store?.name || '—'} → {tr.to_store?.name || '—'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ID: {tr.id.slice(0, 8)} · {new Date(tr.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={tr.status} size="sm" />
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No pending transfers requiring attention.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Inventory Tools Banner */}
        <Card className="shadow-xs bg-linear-to-br from-primary/5 via-background to-muted/30">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {t('inventory.dashboard.quickActions', 'Inventory Master Utilities')}
            </CardTitle>
            <CardDescription className="text-xs">
              Access audit ledgers, valuation computations, and reorder alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              onClick={() => navigate({ to: '/inventory/valuation' })}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t('inventory.valuationPage.title', 'Inventory Valuation')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Generate multi-method asset valuation reports.
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <div
              onClick={() => navigate({ to: '/inventory/alerts' })}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t('inventory.alertsPage.title', 'Inventory Alerts')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Safety stock violations, OOS, and reorder breaches.
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <div
              onClick={() => navigate({ to: '/stock-counts' })}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t('stockBalances.buttons.newAdjustment', 'Physical Stock Counting & Audits')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Barcode-assisted stocktaking with variance reviews.
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
