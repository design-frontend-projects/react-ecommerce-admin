import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { listMovements } from '@/server/fns/inventory-movements'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'

interface RawMovementRow {
  id: string
  movement_type: string
  movement_date: string | Date
  qty?: number | null
  product_variant_id?: string | null
  store_id?: string | null
  reference_id?: string | null
  reference_type?: string | null
  product_variants?: {
    id: string
    sku?: string | null
  } | null
  stores?: {
    store_id: string
    name?: string | null
  } | null
}

interface LedgerMovementItem extends RawMovementRow {
  prevBalance: number
  runningBalance: number
}

interface StoreLookupRow {
  store_id: string
  name?: string | null
}

export function StockLedgerPage() {
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

  // Fetch Movements from server fns
  const { data: rawMovements, isLoading } = useQuery({
    queryKey: ['stock-ledger-movements', user?.id, selectedWarehouse, selectedMovementType],
    queryFn: async () => {
      if (!user?.id) return []
      const res = await listMovements(user.id, {
        storeId: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
        movementType: selectedMovementType === 'all' ? undefined : selectedMovementType,
        limit: 500,
      })
      return (res as unknown as RawMovementRow[]) || []
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
      const key = `${m.product_variant_id}_${m.store_id}`
      const prevBal = balanceTracker[key] || 0
      const delta = Number(m.qty || 0)
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
      const store = (item.stores?.name || '').toLowerCase()
      return sku.includes(term) || ref.includes(term) || store.includes(term)
    })
  }, [rawMovements, searchTerm])

  const exportCSV = () => {
    if (!ledgerEntries.length) return
    const headers = ['Date', 'Type', 'SKU', 'Store', 'In / Out', 'Running Balance', 'Ref']
    const rows = ledgerEntries.map((e) => [
      new Date(e.movement_date).toLocaleString(),
      e.movement_type,
      e.product_variants?.sku || e.product_variant_id || '—',
      e.stores?.name || '—',
      String(e.qty ?? 0),
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

  const movementTypeOptions = [
    { value: 'opening_stock', label: 'Opening Stock' },
    { value: 'purchase', label: 'Purchase Receipt' },
    { value: 'sale', label: 'Sales Order' },
    { value: 'transfer_in', label: 'Transfer In' },
    { value: 'transfer_out', label: 'Transfer Out' },
    { value: 'adjustment_in', label: 'Adjustment (In)' },
    { value: 'adjustment_out', label: 'Adjustment (Out)' },
    { value: 'damage', label: 'Damaged / Write-off' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Stock Ledger & Audit Movements
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete chronological record of all stock inflows, outflows, and running balances.
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
          Export Ledger (CSV)
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter by SKU, Store, or Document Reference..."
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
            <CardTitle className="text-base font-bold">Ledger Transactions</CardTitle>
            <CardDescription className="text-xs">
              Showing {ledgerEntries.length} movement records.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold">
            {ledgerEntries.length} Records
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Loading inventory movement ledger...
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10">
              No inventory ledger movements match the selected filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Date / Time</TableHead>
                    <TableHead className="text-xs">Movement Type</TableHead>
                    <TableHead className="text-xs">Product Variant (SKU)</TableHead>
                    <TableHead className="text-xs">Location / Store</TableHead>
                    <TableHead className="text-xs text-end">In (+) / Out (-)</TableHead>
                    <TableHead className="text-xs text-end">Running Balance</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
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
                            {row.movement_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.product_variants?.sku ?? row.product_variant_id?.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.stores?.name ?? '—'}
                        </TableCell>
                        <TableCell
                          className={
                            isInflow
                              ? 'text-end font-bold text-emerald-600 tabular-nums'
                              : 'text-end font-bold text-rose-600 tabular-nums'
                          }
                        >
                          {isInflow ? '+' : ''}
                          {row.qty}
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
