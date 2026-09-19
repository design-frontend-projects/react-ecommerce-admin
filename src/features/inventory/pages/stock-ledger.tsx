import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Download,
  History,
  ArrowDownLeft,
  ArrowUpRight,
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
import { FilterBar } from '@/components/shared/filter-bar'
import { fetchMovements } from '@/features/inventory-movements/data/actions'
import type {
  MovementRow,
  MovementFilters,
} from '@/features/inventory-movements/data/schema'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'

interface LedgerMovementItem extends MovementRow {
  prevBalance: number
  runningBalance: number
}

interface StoreLookupRow {
  store_id: string
  name?: string | null
}

export function StockLedgerPage() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const user = useAuthStore((state) => state.auth.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedMovementType, setSelectedMovementType] = useState('all')

  // Fetch stores for filter dropdown
  const { data: stores } = useQuery({
    queryKey: ['stores-lookup', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('store_id, name')
      return (data as StoreLookupRow[]) || []
    },
  })

  const filters = useMemo<MovementFilters>(
    () => ({
      storeId: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
      movementType:
        selectedMovementType === 'all' ? undefined : selectedMovementType,
      limit: 500,
    }),
    [selectedWarehouse, selectedMovementType]
  )

  // Fetch Movements via API route
  const { data: rawMovements, isLoading } = useQuery({
    queryKey: ['stock-ledger-movements', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return []
      return fetchMovements(getToken, filters)
    },
    enabled: !!user?.id,
  })

  // Compute running balance per variant & warehouse
  const ledgerEntries: LedgerMovementItem[] = useMemo(() => {
    if (!rawMovements) return []

    // Sort chronologically ascending to compute running balances, then display descending
    const sorted = [...rawMovements].sort(
      (a, b) =>
        new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime()
    )

    const balanceTracker: Record<string, number> = {}
    const withBalances = sorted.map((m) => {
      const facilityKey = m.store_id || m.warehouse_id || 'default'
      const key = `${m.product_variant_id}_${facilityKey}`
      const prevBal = balanceTracker[key] || 0
      const delta = Number(m.qty ?? m.quantity_delta ?? 0)
      const newBal = prevBal + delta
      balanceTracker[key] = newBal

      return {
        ...m,
        prevBalance: prevBal,
        runningBalance: newBal,
      }
    })

    // Now reverse for display (newest first)
    const reversed = withBalances.reverse()

    if (!searchTerm.trim()) return reversed

    const term = searchTerm.toLowerCase()
    return reversed.filter((item) => {
      const sku = (item.product_variants?.sku || '').toLowerCase()
      const ref = (item.reference_id || item.id || '').toLowerCase()
      const location = (
        item.stores?.name ||
        item.warehouses?.name ||
        ''
      ).toLowerCase()
      return (
        sku.includes(term) || ref.includes(term) || location.includes(term)
      )
    })
  }, [rawMovements, searchTerm])

  const exportCSV = () => {
    if (!ledgerEntries.length) return
    const headers = [
      'Date',
      'Type',
      'SKU',
      'Store / Warehouse',
      'In / Out',
      'Running Balance',
      'Ref',
    ]
    const rows = ledgerEntries.map((e) => [
      new Date(e.movement_date).toLocaleString(),
      e.movement_type,
      e.product_variants?.sku || e.product_variant_id || '—',
      e.stores?.name || e.warehouses?.name || '—',
      String(e.qty ?? e.quantity_delta ?? 0),
      String(e.runningBalance),
      e.reference_id || '—',
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `stock_ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const warehouseOptions = (stores || []).map((s) => ({
    value: s.store_id,
    label: s.name || s.store_id,
  }))

  const movementTypeOptions = useMemo(
    () => [
      { value: 'opening_stock', label: t('inventory.ledgerPage.movementTypes.opening_stock', 'Opening Stock') },
      { value: 'purchase', label: t('inventory.ledgerPage.movementTypes.purchase', 'Purchase Receipt') },
      { value: 'sale', label: t('inventory.ledgerPage.movementTypes.sale', 'Sales Order') },
      { value: 'transfer_in', label: t('inventory.ledgerPage.movementTypes.transfer_in', 'Transfer In') },
      { value: 'transfer_out', label: t('inventory.ledgerPage.movementTypes.transfer_out', 'Transfer Out') },
      { value: 'adjustment_in', label: t('inventory.ledgerPage.movementTypes.adjustment_in', 'Adjustment (In)') },
      { value: 'adjustment_out', label: t('inventory.ledgerPage.movementTypes.adjustment_out', 'Adjustment (Out)') },
      { value: 'damage', label: t('inventory.ledgerPage.movementTypes.damage', 'Damaged / Write-off') },
    ],
    [t]
  )

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            {t('inventory.ledgerPage.title', 'Stock Ledger & Audit Movements')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.ledgerPage.description', 'Complete chronological record of all stock inflows, outflows, and running balances.')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={!ledgerEntries.length}
          className="gap-2 text-xs"
        >
          <Download className="h-4 w-4" />
          {t('inventory.ledgerPage.exportCsv', 'Export Ledger (CSV)')}
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('inventory.ledgerPage.filterSearch', 'Filter by SKU, Store, or Document Reference...')}
        warehouseOptions={warehouseOptions}
        selectedWarehouse={selectedWarehouse}
        onWarehouseChange={setSelectedWarehouse}
        statusOptions={movementTypeOptions}
        selectedStatus={selectedMovementType}
        onStatusChange={setSelectedMovementType}
        onReset={() => {
          setSearchTerm('')
          setSelectedWarehouse('all')
          setSelectedMovementType('all')
        }}
      />

      {/* Ledger Table Card */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">{t('inventory.ledgerPage.transactions', 'Ledger Transactions')}</CardTitle>
            <CardDescription className="text-xs">
              {t('inventory.ledgerPage.showingRecords', { count: ledgerEntries.length, defaultValue: `Showing ${ledgerEntries.length} movement records.` })}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold">
            {t('inventory.ledgerPage.recordsCount', { count: ledgerEntries.length, defaultValue: `${ledgerEntries.length} Records` })}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {t('inventory.ledgerPage.loadingLedger', 'Loading inventory movement ledger...')}
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10">
              {t('inventory.ledgerPage.noMovements', 'No inventory ledger movements match the selected filters.')}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">{t('inventory.ledgerPage.date', 'Date / Time')}</TableHead>
                    <TableHead className="text-xs">{t('inventory.ledgerPage.type', 'Movement Type')}</TableHead>
                    <TableHead className="text-xs">{t('inventory.ledgerPage.sku', 'Product Variant (SKU)')}</TableHead>
                    <TableHead className="text-xs">{t('inventory.ledgerPage.facility', 'Location / Store')}</TableHead>
                    <TableHead className="text-xs text-end">{t('inventory.ledgerPage.inOut', 'In (+) / Out (-)')}</TableHead>
                    <TableHead className="text-xs text-end">{t('inventory.ledgerPage.runningBalance', 'Running Balance')}</TableHead>
                    <TableHead className="text-xs">{t('inventory.ledgerPage.reference', 'Reference')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((row) => {
                    const isInflow = Number(row.qty || 0) > 0
                    return (
                      <TableRow key={row.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(row.movement_date).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isInflow
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                            }
                          >
                            {isInflow ? (
                              <ArrowDownLeft className="h-3 w-3 mr-1 inline text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 mr-1 inline text-rose-600" />
                            )}
                            {t(
                              `inventory.ledgerPage.movementTypes.${row.movement_type}`,
                              row.movement_type.replace('_', ' ')
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.product_variants?.sku ?? row.product_variant_id?.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.stores?.name ?? row.warehouses?.name ?? '—'}
                        </TableCell>
                        <TableCell
                          className={
                            isInflow
                              ? 'text-end font-bold text-emerald-600 tabular-nums'
                              : 'text-end font-bold text-rose-600 tabular-nums'
                          }
                        >
                          {isInflow ? '+' : ''}
                          {row.qty ?? row.quantity_delta}
                        </TableCell>
                        <TableCell className="text-end font-bold tabular-nums text-foreground">
                          {row.runningBalance}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-[11px]">
                          {row.reference_type ? `${row.reference_type}: ` : ''}
                          {row.reference_id?.slice(0, 8) || '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
