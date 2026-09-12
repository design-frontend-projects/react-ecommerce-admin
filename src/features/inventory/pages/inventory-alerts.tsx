import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)
  const [activeTab, setActiveTab] = useState('all')

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['inventory-alerts-aggregate', user?.id],
    queryFn: async () => {
      // 1. Fetch balances with low stock
      const { data: balances } = await supabase
        .from('stock_balances')
        .select('qty_on_hand, qty_reserved, qty_available, product_variant_id, store_id, stores(name), warehouse_id, warehouses(name, code)')

      // 2. Fetch variants & products & reorder rules
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, sku, products(id, name)')

      const { data: rules } = await supabase
        .from('reorder_rules')
        .select('store_id, product_variant_id, min_qty')

      // 3. Fetch expiring batches
      const now = new Date()
      const in30Days = new Date()
      in30Days.setDate(now.getDate() + 30)

      const { data: batches } = await supabase
        .from('product_batches')
        .select('id, batch_number, expiry_date, status, product_variant_id, store_id')

      const oosAlerts: InventoryAlertItem[] = []
      const lowStockAlerts: InventoryAlertItem[] = []
      const expiringAlerts: InventoryAlertItem[] = []

      // Map rules
      const ruleMap = new Map<string, number>()
      for (const r of (rules as ReorderRuleItem[]) || []) {
        const key = `${r.store_id || 'all'}_${r.product_variant_id}`
        ruleMap.set(key, Number(r.min_qty || 10))
      }

      // Map variants
      const variantMap = new Map(
        (variants || []).map((v) => [
          v.id,
          { sku: v.sku, name: (v.products as { name?: string })?.name || 'Unknown Product' },
        ])
      )

      for (const b of balances || []) {
        const onHand = Number(b.qty_on_hand || 0)
        const vInfo = variantMap.get(b.product_variant_id) || {
          sku: 'UNKNOWN',
          name: 'Unknown Variant',
        }
        const wh = b.warehouses as { name?: string; code?: string } | null
        const storeName = wh
          ? wh.code
            ? `${wh.name} [${wh.code}]`
            : wh.name || 'Warehouse'
          : (b.stores as { name?: string })?.name || 'Default Facility'
        const ruleKey = `${b.store_id}_${b.product_variant_id}`
        const threshold = ruleMap.get(ruleKey) || ruleMap.get(`all_${b.product_variant_id}`) || 10

        if (onHand === 0) {
          oosAlerts.push({
            id: `oos-${b.product_variant_id}-${b.store_id}`,
            type: 'out_of_stock',
            severity: 'critical',
            title: t('inventory.status.outOfStock', 'Out of Stock'),
            sku: vInfo.sku,
            productName: vInfo.name,
            storeName,
            onHand: 0,
            threshold,
            suggestedAction: t('inventory.alertsPage.reorderNow', 'Reorder Now'),
            actionUrl: '/purchase-requisitions',
          })
        } else if (onHand <= threshold) {
          lowStockAlerts.push({
            id: `low-${b.product_variant_id}-${b.store_id}`,
            type: 'low_stock',
            severity: 'warning',
            title: t('inventory.status.lowStock', 'Low Stock'),
            sku: vInfo.sku,
            productName: vInfo.name,
            storeName,
            onHand,
            threshold,
            suggestedAction: t('inventory.alertsPage.reorderNow', 'Reorder Now'),
            actionUrl: '/purchase-requisitions',
          })
        }
      }

      // Expiring batches
      for (const batch of batches || []) {
        if (!batch.expiry_date) continue
        const exp = new Date(batch.expiry_date)
        const vInfo = variantMap.get(batch.product_variant_id) || {
          sku: 'BATCH',
          name: 'Batch Product',
        }
        if (exp <= in30Days) {
          expiringAlerts.push({
            id: `exp-${batch.id}`,
            type: 'expiry',
            severity: exp < now ? 'critical' : 'warning',
            title: exp < now ? t('inventory.expiryPage.urgency.expired', 'Expired') : t('inventory.alertsPage.expiry', 'Expiring Soon'),
            sku: batch.batch_number || 'N/A',
            productName: vInfo.name,
            storeName: 'Warehouse',
            onHand: exp < now ? t('inventory.expiryPage.urgency.expired', 'Expired') : `${Math.ceil((exp.getTime() - now.getTime()) / 86400000)}d`,
            threshold: new Date(batch.expiry_date).toLocaleDateString(),
            suggestedAction: t('inventory.alertsPage.viewBatches', 'View Batches'),
            actionUrl: '/inventory/expiry',
          })
        }
      }

      return {
        allAlerts: [...oosAlerts, ...lowStockAlerts, ...expiringAlerts],
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
            {t('inventory.alertsPage.title', 'Inventory Alerts')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.alertsPage.description', 'Automated alerts for safety stock breaches, stockouts, and shelf-life risks.')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('inventory.alertsPage.refresh', 'Refresh Alerts')}
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
                {t('inventory.alertsPage.outOfStock', 'Out of Stock (OOS)')}
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {alertsData?.oosAlerts?.length || 0} {t('inventory.alertsPage.sku', 'SKUs')}
              </p>
              <p className="text-[11px] text-muted-foreground">{t('inventory.alertsPage.zeroBalance', 'Zero balance available')}</p>
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
                {t('inventory.alertsPage.lowStock', 'Below Safety Stock')}
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {alertsData?.lowStockAlerts?.length || 0} {t('inventory.alertsPage.sku', 'SKUs')}
              </p>
              <p className="text-[11px] text-muted-foreground">{t('inventory.alertsPage.breachedMin', 'Breached minimum threshold')}</p>
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
                {t('inventory.alertsPage.expiry', 'Batches Expiring (<30d)')}
              </p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {alertsData?.expiringAlerts?.length || 0} {t('inventory.expiryPage.batches', 'Batches')}
              </p>
              <p className="text-[11px] text-muted-foreground">{t('inventory.alertsPage.immediateClearance', 'Immediate clearance suggested')}</p>
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
            {t('inventory.alertsPage.allAlerts', 'All Alerts')} ({alertsData?.allAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="oos" className="text-xs font-semibold text-rose-600">
            {t('inventory.alertsPage.outOfStock', 'Out of Stock')} ({alertsData?.oosAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="low" className="text-xs font-semibold text-amber-600">
            {t('inventory.alertsPage.lowStock', 'Low Stock')} ({alertsData?.lowStockAlerts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="expiry" className="text-xs font-semibold text-orange-600">
            {t('inventory.alertsPage.expiry', 'Expiry')} ({alertsData?.expiringAlerts?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="pt-2">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{t('inventory.alertsPage.activeViolations', 'Active Inventory Violations')}</CardTitle>
              <CardDescription className="text-xs">
                {t('inventory.alertsPage.itemsRequiringAttention', 'Items requiring attention or replenishment.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  {t('inventory.alertsPage.scanning', 'Scanning inventory triggers and safety limits...')}
                </div>
              ) : displayedAlerts.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10 flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="font-semibold text-foreground">{t('inventory.alertsPage.noAlertsTitle', 'No Active Inventory Alerts')}</p>
                  <p className="text-xs">{t('inventory.alertsPage.noAlerts', 'All stock levels and batches meet safety thresholds.')}</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">{t('inventory.alertsPage.alertType', 'Alert Type')}</TableHead>
                        <TableHead className="text-xs">{t('inventory.alertsPage.skuBatch', 'SKU / Batch')}</TableHead>
                        <TableHead className="text-xs">{t('inventory.alertsPage.product', 'Product Name')}</TableHead>
                        <TableHead className="text-xs">{t('inventory.alertsPage.facility', 'Store / Location')}</TableHead>
                        <TableHead className="text-xs text-end">{t('inventory.alertsPage.onHandStatus', 'On-Hand / Status')}</TableHead>
                        <TableHead className="text-xs text-end">{t('inventory.alertsPage.threshold', 'Safety Min')}</TableHead>
                        <TableHead className="text-xs text-end">{t('inventory.alertsPage.action', 'Action Trigger')}</TableHead>
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
