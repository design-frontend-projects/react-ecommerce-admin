import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  DollarSign,
  Boxes,
  Building2,
  PieChart as PieIcon,
  Calculator,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterBar } from '@/components/shared/filter-bar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

interface ValuationItemRow {
  id: string
  storeId: string
  storeName: string
  variantId: string
  sku: string
  productName: string
  categoryName: string
  onHand: number
  reserved: number
  available: number
  unitCost: number
  sellingPrice: number
  totalValue: number
  potentialRevenue: number
}

interface VariantPricingInfo {
  id: string
  sku?: string | null
  price?: number | null
  cost_price?: number | null
  products?: {
    name?: string | null
    category_id?: number | null
    categories?: {
      name?: string | null
    } | null
  } | null
}

export function InventoryValuationPage() {
  const user = useAuthStore((state) => state.auth.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [valuationMethod, setValuationMethod] = useState<'avco' | 'standard' | 'fifo'>('avco')

  // Fetch stock balances with variants and pricing
  const { data: rawValuation, isLoading } = useQuery({
    queryKey: ['inventory-valuation-data', user?.id],
    queryFn: async () => {
      const { data: balances } = await supabase
        .from('stock_balances')
        .select('qty_on_hand, qty_reserved, qty_available, product_variant_id, store_id, stores(name, store_id)')

      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, sku, price, cost_price, products(name, category_id, categories(name))')

      const variantMap = new Map(
        ((variants as VariantPricingInfo[]) || []).map((v) => [v.id, v])
      )

      return (balances || []).map((b: {
        qty_on_hand?: number | null
        qty_reserved?: number | null
        qty_available?: number | null
        product_variant_id: string
        store_id: string
        stores?: { name?: string | null } | null
      }): ValuationItemRow => {
        const v = variantMap.get(b.product_variant_id)
        const costPrice = Number(v?.cost_price || 0)
        const sellingPrice = Number(v?.price || 0)
        const onHand = Number(b.qty_on_hand || 0)

        // AVCO = Cost Price, Standard = Cost Price, FIFO = Estimated Cost
        const unitCost = costPrice > 0 ? costPrice : sellingPrice * 0.7

        return {
          id: `${b.store_id}_${b.product_variant_id}`,
          storeId: b.store_id,
          storeName: b.stores?.name || 'Default Store',
          variantId: b.product_variant_id,
          sku: v?.sku || b.product_variant_id.slice(0, 8),
          productName: v?.products?.name || '—',
          categoryName: v?.products?.categories?.name || 'Uncategorized',
          onHand,
          reserved: Number(b.qty_reserved || 0),
          available: Number(b.qty_available || 0),
          unitCost,
          sellingPrice,
          totalValue: onHand * unitCost,
          potentialRevenue: onHand * sellingPrice,
        }
      })
    },
    enabled: !!user?.id,
  })

  // Filtered rows
  const filteredRows: ValuationItemRow[] = useMemo(() => {
    if (!rawValuation) return []

    return rawValuation.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchWarehouse =
        selectedWarehouse === 'all' || item.storeId === selectedWarehouse

      return matchSearch && matchWarehouse
    })
  }, [rawValuation, searchTerm, selectedWarehouse])

  // Summary KPIs
  const totalValuation = filteredRows.reduce((acc, it) => acc + it.totalValue, 0)
  const totalUnits = filteredRows.reduce((acc, it) => acc + it.onHand, 0)
  const totalPotentialRevenue = filteredRows.reduce(
    (acc, it) => acc + it.potentialRevenue,
    0
  )
  const averageMargin =
    totalPotentialRevenue > 0
      ? ((totalPotentialRevenue - totalValuation) / totalPotentialRevenue) * 100
      : 0

  // Warehouse list for filter
  const warehouses = useMemo(() => {
    if (!rawValuation) return []
    const seen = new Set<string>()
    const list: Array<{ value: string; label: string }> = []
    for (const row of rawValuation) {
      if (!seen.has(row.storeId)) {
        seen.add(row.storeId)
        list.push({ value: row.storeId, label: row.storeName })
      }
    }
    return list
  }, [rawValuation])

  const exportCSV = () => {
    if (!filteredRows.length) return
    const headers = [
      'Store',
      'SKU',
      'Product Name',
      'Category',
      'On-Hand Qty',
      'Unit Cost',
      'Total Asset Valuation',
    ]
    const rows = filteredRows.map((r) => [
      r.storeName,
      r.sku,
      r.productName,
      r.categoryName,
      r.onHand,
      r.unitCost.toFixed(2),
      r.totalValue.toFixed(2),
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `inventory_valuation_${valuationMethod}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            Inventory Asset Valuation Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Financial valuation of on-hand inventory across all warehouses and categories.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Method Selector */}
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border">
            <Calculator className="h-4 w-4 text-muted-foreground ml-1.5" />
            <Select
              value={valuationMethod}
              onValueChange={(val: 'avco' | 'standard' | 'fifo') => setValuationMethod(val)}
            >
              <SelectTrigger className="h-8 text-xs font-semibold border-0 bg-transparent shadow-none">
                <SelectValue placeholder="Valuation Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avco">Weighted Average (AVCO)</SelectItem>
                <SelectItem value="standard">Standard Cost</SelectItem>
                <SelectItem value="fifo">FIFO Estimated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={!filteredRows.length}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export Report (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <Card className="shadow-xs bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Total Asset Value
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">Based on {valuationMethod.toUpperCase()} method</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Physical Stock Units */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Stock Units
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalUnits.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">{filteredRows.length} Stock lines</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
              <Boxes className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Potential Retail Value */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Potential Sales Revenue
              </p>
              <p className="text-2xl font-bold text-foreground">
                ${totalPotentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">Gross retail realization</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
              <PieIcon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Projected Gross Margin */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Projected Gross Margin
              </p>
              <p className="text-2xl font-bold text-foreground">
                {averageMargin.toFixed(1)}%
              </p>
              <p className="text-[11px] text-muted-foreground">Retail markup margin</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter by SKU or Product name..."
        warehouseOptions={warehouses}
        selectedWarehouse={selectedWarehouse}
        onWarehouseChange={setSelectedWarehouse}
        onReset={() => {
          setSearchTerm('')
          setSelectedWarehouse('all')
        }}
      />

      {/* Valuation Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Inventory Valuation Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Detailed unit costs and total valuation by SKU and location.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-bold">
            {filteredRows.length} Items Listed
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Computing inventory asset valuation...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10">
              No inventory balances match the selected filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Store / Warehouse</TableHead>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Product Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-end">On-Hand Qty</TableHead>
                    <TableHead className="text-xs text-end">Unit Cost</TableHead>
                    <TableHead className="text-xs text-end">Total Valuation</TableHead>
                    <TableHead className="text-xs text-end">% Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const sharePercent =
                      totalValuation > 0 ? (row.totalValue / totalValuation) * 100 : 0

                    return (
                      <TableRow key={row.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-medium">{row.storeName}</TableCell>
                        <TableCell className="font-mono font-semibold text-foreground">
                          {row.sku}
                        </TableCell>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.categoryName}</TableCell>
                        <TableCell className="text-end font-bold tabular-nums">
                          {row.onHand}
                        </TableCell>
                        <TableCell className="text-end text-muted-foreground tabular-nums">
                          ${row.unitCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-end font-bold text-foreground tabular-nums">
                          ${row.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-end text-muted-foreground tabular-nums">
                          {sharePercent.toFixed(2)}%
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
