import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

interface InventoryAlertItem {
  id: string
  type: 'out_of_stock' | 'low_stock' | 'expiry'
  severity: 'critical' | 'warning'
  title: string
  sku: string
  productName: string
  storeName: string
  onHand: number | string
  threshold: number | string
  suggestedAction: string
  actionUrl: string
}

interface ReorderRuleItem {
  store_id?: string | null
  product_variant_id: string
  min_qty?: number | null
}

export function InventoryAlertsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)
  const [activeTab, setActiveTab] = useState('all')

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['inventory-alerts-aggregate', user?.id],
    queryFn: async () => {
      // 1. Fetch balances with low stock
      const { data: balances } = await supabase
        .from('stock_balances')
        .select('qty_on_hand, qty_reserved, qty_available, product_variant_id, store_id, stores(name)')

      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, sku, products(name, category_id, categories(name))')

      const variantMap = new Map(
        (variants || []).map((v: { id: string; sku: string; products: unknown }) => [
          v.id,
          v,
        ])
      )

      // 2. Fetch reorder rules
      const { data: reorderRules } = await supabase
        .from('reorder_rules')
        .select('*')

      const ruleMap = new Map(
        ((reorderRules as ReorderRuleItem[]) || []).map((r) => [
          `${r.store_id || ''}_${r.product_variant_id}`,
          r,
        ])
      )

      // 3. Fetch expiring batches
      const now = new Date()
      const in30Days = new Date()
      in30Days.setDate(now.getDate() + 30)

      const { data: batches } = await supabase
        .from('product_batches')
        .select('id, batch_number, expiry_date, status')

      const oosAlerts: InventoryAlertItem[] = []
      const lowStockAlerts: InventoryAlertItem[] = []
      const expiringAlerts: InventoryAlertItem[] = []

      for (const b of balances || []) {
        const onHand = Number(b.qty_on_hand || 0)
        const v = variantMap.get(b.product_variant_id)
        const rule =
          ruleMap.get(`${b.store_id}_${b.product_variant_id}`) ||
          ruleMap.get(`_${b.product_variant_id}`)
        const reorderPoint = rule ? Number(rule.min_qty || 10) : 10

        const prodName = (v?.products as { name?: string })?.name || '—'
        const storeName = (b.stores as { name?: string })?.name || 'Default Store'

        if (onHand <= 0) {
          oosAlerts.push({
            id: `oos_${b.store_id}_${b.product_variant_id}`,
            type: 'out_of_stock',
            severity: 'critical',
            title: 'Out of Stock',
            sku: v?.sku || b.product_variant_id.slice(0, 8),
            productName: prodName,
            storeName,
            onHand: 0,
            threshold: reorderPoint,
            suggestedAction: 'Create Requisition / PO',
            actionUrl: '/purchase-requisitions',
          })
        } else if (onHand < reorderPoint) {
          lowStockAlerts.push({
            id: `low_${b.store_id}_${b.product_variant_id}`,
            type: 'low_stock',
            severity: 'warning',
            title: 'Below Safety Stock',
            sku: v?.sku || b.product_variant_id.slice(0, 8),
            productName: prodName,
            storeName,
            onHand,
            threshold: reorderPoint,
            suggestedAction: 'Transfer Stock / Reorder',
            actionUrl: '/stock-transfers',
          })
        }
      }

      for (const batch of batches || []) {
        if (!batch.expiry_date) continue
        const exp = new Date(batch.expiry_date)
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays <= 30) {
          expiringAlerts.push({
            id: `exp_${batch.id}`,
            type: 'expiry',
            severity: diffDays < 0 ? 'critical' : 'warning',
            title: diffDays < 0 ? 'Batch Expired' : 'Expiring Soon',
            sku: batch.batch_number || batch.id.slice(0, 8),
            productName: `Batch #${batch.batch_number || batch.id.slice(0, 8)}`,
            storeName: 'Warehouse',
            onHand: diffDays < 0 ? `Expired (${Math.abs(diffDays)}d ago)` : `${diffDays} days left`,
            threshold: '30 Days Threshold',
            suggestedAction: diffDays < 0 ? 'Write-off Adjustment' : 'Clearance Transfer',
            actionUrl: diffDays < 0 ? '/stock-adjustments' : '/stock-transfers',
          })
        }
      }

      const allAlerts = [...oosAlerts, ...lowStockAlerts, ...expiringAlerts]

      return {
        allAlerts,
        oosAlerts,
        lowStockAlerts,
        expiringAlerts,
      }
    },
    staleTime: 30000,
  })

  const displayedAlerts = useMemo(() => {
    if (!alertsData) return []
    if (activeTab === 'oos') return alertsData.oosAlerts
    if (activeTab === 'low') return alertsData.lowStockAlerts
    if (activeTab === 'expiry') return alertsData.expiringAlerts
    return alertsData.allAlerts
  }, [alertsData, activeTab])

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Inventory Alerts & Reorder Triage Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Automated alerts for safety stock breaches, stockouts, and shelf-life risks.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Alerts
        </Button>
      </div>

      {/* KPI Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          onClick={() => setActiveTab('oos')}
          className="cursor-pointer border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-400 transition-all shadow-xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Out of Stock (OOS)
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {alertsData?.oosAlerts?.length || 0} SKUs
              </p>
              <p className="text-[11px] text-muted-foreground">Zero balance available</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('low')}
          className="cursor-pointer border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400 transition-all shadow-xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Below Safety Stock
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {alertsData?.lowStockAlerts?.length || 0} SKUs
              </p>
              <p className="text-[11px] text-muted-foreground">Breached minimum threshold</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setActiveTab('expiry')}
          className="cursor-pointer border-orange-300 dark:border-orange-900 bg-orange-50/40 dark:bg-orange-950/20 hover:border-orange-400 transition-all shadow-xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                Batches Expiring (&lt;30d)
              </p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {alertsData?.expiringAlerts?.length || 0} Batches
              </p>
              <p className="text-[11px] text-muted-foreground">Immediate clearance suggested</p>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Alerts Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg mb-2">
          <TabsTrigger value="all" className="text-xs font-semibold">
            All Alerts ({alertsData?.allAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="oos" className="text-xs font-semibold text-rose-600">
            Out of Stock ({alertsData?.oosAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="low" className="text-xs font-semibold text-amber-600">
            Low Stock ({alertsData?.lowStockAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="expiry" className="text-xs font-semibold text-orange-600">
            Expiry ({alertsData?.expiringAlerts?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="pt-2">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Active Inventory Violations</CardTitle>
              <CardDescription className="text-xs">
                Items requiring attention or replenishment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  Scanning inventory triggers and safety limits...
                </div>
              ) : displayedAlerts.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10 flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="font-semibold text-foreground">No Active Inventory Alerts</p>
                  <p className="text-xs">All stock levels and batches meet safety thresholds.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Alert Type</TableHead>
                        <TableHead className="text-xs">SKU / Batch</TableHead>
                        <TableHead className="text-xs">Product Name</TableHead>
                        <TableHead className="text-xs">Store / Location</TableHead>
                        <TableHead className="text-xs text-end">On-Hand / Status</TableHead>
                        <TableHead className="text-xs text-end">Safety Min</TableHead>
                        <TableHead className="text-xs text-end">Action Trigger</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedAlerts.map((alert) => (
                        <TableRow key={alert.id} className="text-xs hover:bg-muted/30">
                          <TableCell>
                            <Badge
                              variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                              className={
                                alert.severity === 'warning'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]'
                                  : 'text-[10px]'
                              }
                            >
                              {alert.title}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-foreground">
                            {alert.sku}
                          </TableCell>
                          <TableCell className="font-medium">{alert.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{alert.storeName}</TableCell>
                          <TableCell className="text-end font-bold tabular-nums">
                            {alert.onHand}
                          </TableCell>
                          <TableCell className="text-end text-muted-foreground tabular-nums">
                            {alert.threshold}
                          </TableCell>
                          <TableCell className="text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate({ to: alert.actionUrl })}
                              className="h-7 text-xs text-primary font-semibold hover:text-primary/80"
                            >
                              {alert.suggestedAction} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
