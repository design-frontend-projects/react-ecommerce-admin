import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  AlertOctagon,
  CalendarAlert,
  Search,
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { StockAlertItem, DashboardCurrency } from '../types'

interface StockAlertsTableProps {
  alerts: StockAlertItem[]
  currency: DashboardCurrency
  initialFilter?: string
}

export function StockAlertsTable({
  alerts,
  currency,
  initialFilter = 'all',
}: StockAlertsTableProps) {
  const [filterTab, setFilterTab] = useState<string>(initialFilter)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Tab filter
      if (filterTab === 'out_of_stock' && item.status !== 'out_of_stock') return false
      if (filterTab === 'low_stock' && item.status !== 'low_stock') return false
      if (filterTab === 'expiry' && item.status !== 'expiring' && item.status !== 'expired')
        return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = item.name.toLowerCase().includes(q)
        const matchesSku = item.sku.toLowerCase().includes(q)
        const matchesCat = item.categoryName.toLowerCase().includes(q)
        return matchesName || matchesSku || matchesCat
      }

      return true
    })
  }, [alerts, filterTab, searchQuery])

  const outOfStockCount = alerts.filter((a) => a.status === 'out_of_stock').length
  const lowStockCount = alerts.filter((a) => a.status === 'low_stock').length
  const expiryCount = alerts.filter(
    (a) => a.status === 'expiring' || a.status === 'expired'
  ).length

  return (
    <Card className='border border-border/60 bg-card/60 backdrop-blur-md shadow-xs'>
      <CardHeader className='p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 text-amber-500' />
            <CardTitle className='text-base font-semibold text-foreground'>
              Stock & Replenishment Alerts
            </CardTitle>
            <Badge variant='outline' className='text-xs font-semibold'>
              {alerts.length} Total
            </Badge>
          </div>
          <CardDescription className='text-xs text-muted-foreground'>
            Items breaching minimum safety stock or approaching expiration dates
          </CardDescription>
        </div>

        {/* Tab & Search Controls */}
        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative w-44'>
            <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search alerts...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-8 pl-8 text-xs bg-background/60 border-border/60'
            />
          </div>

          <div className='flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/40'>
            <button
              type='button'
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                filterTab === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              type='button'
              onClick={() => setFilterTab('out_of_stock')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                filterTab === 'out_of_stock'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
            <button
              type='button'
              onClick={() => setFilterTab('low_stock')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                filterTab === 'low_stock'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              type='button'
              onClick={() => setFilterTab('expiry')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                filterTab === 'expiry'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Expiry ({expiryCount})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        {filteredAlerts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground'>
            <ShieldCheck className='w-8 h-8 text-emerald-500 mb-2' />
            <p className='text-sm font-semibold text-foreground'>No alerts found</p>
            <p className='text-xs'>All products in this category meet safe inventory thresholds.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-muted/40 text-[11px] uppercase tracking-wider'>
                <TableRow className='hover:bg-transparent border-border/40'>
                  <TableHead className='py-2.5 pl-5'>Product & SKU</TableHead>
                  <TableHead className='py-2.5'>Category / Warehouse</TableHead>
                  <TableHead className='py-2.5'>Stock Level</TableHead>
                  <TableHead className='py-2.5'>Condition / Urgency</TableHead>
                  <TableHead className='py-2.5 pr-5 text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-xs divide-y divide-border/30'>
                {filteredAlerts.slice(0, 15).map((item) => (
                  <TableRow
                    key={`${item.id}-${item.status}`}
                    className='hover:bg-muted/30 transition-colors'
                  >
                    {/* Product & SKU */}
                    <TableCell className='py-3 pl-5'>
                      <div className='space-y-0.5 max-w-[220px] sm:max-w-xs'>
                        <span className='font-semibold text-foreground block truncate' title={item.name}>
                          {item.name}
                        </span>
                        <div className='flex items-center gap-2 text-[11px] text-muted-foreground font-mono'>
                          <span>SKU: {item.sku}</span>
                          {item.batchNumber && (
                            <span className='px-1 py-0.2 bg-muted rounded text-[10px]'>
                              Batch: {item.batchNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Category & Warehouse */}
                    <TableCell className='py-3'>
                      <div className='space-y-0.5 text-muted-foreground'>
                        <span className='block text-foreground text-xs font-medium'>
                          {item.categoryName}
                        </span>
                        <span className='text-[11px] text-muted-foreground block truncate max-w-[130px]'>
                          {item.warehouseName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Stock Level */}
                    <TableCell className='py-3'>
                      <div className='space-y-1 min-w-[120px]'>
                        <div className='flex items-center justify-between text-[11px]'>
                          <span
                            className={`font-bold ${
                              item.qtyAvailable <= 0
                                ? 'text-red-500'
                                : item.qtyAvailable <= item.minQuantity
                                ? 'text-amber-500'
                                : 'text-foreground'
                            }`}
                          >
                            {item.qtyAvailable.toLocaleString()} Avail
                          </span>
                          <span className='text-muted-foreground text-[10px]'>
                            Min: {item.minQuantity}
                          </span>
                        </div>
                        {/* Mini visual fill bar */}
                        <div className='w-full h-1.5 rounded-full bg-muted overflow-hidden'>
                          <div
                            className={`h-full rounded-full ${
                              item.qtyAvailable <= 0
                                ? 'bg-red-500 w-0'
                                : item.qtyAvailable <= item.minQuantity
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(10, (item.qtyAvailable / Math.max(1, item.minQuantity * 2)) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Status & Urgency */}
                    <TableCell className='py-3'>
                      {item.status === 'out_of_stock' && (
                        <Badge
                          variant='outline'
                          className='bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-[11px] gap-1'
                        >
                          <AlertOctagon className='w-3 h-3' />
                          Out of Stock
                        </Badge>
                      )}
                      {item.status === 'low_stock' && (
                        <Badge
                          variant='outline'
                          className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1'
                        >
                          <AlertTriangle className='w-3 h-3' />
                          Low Stock
                        </Badge>
                      )}
                      {item.status === 'expired' && (
                        <Badge
                          variant='outline'
                          className='bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[11px] gap-1'
                        >
                          <CalendarAlert className='w-3 h-3' />
                          Expired
                        </Badge>
                      )}
                      {item.status === 'expiring' && (
                        <Badge
                          variant='outline'
                          className='bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 text-[11px] gap-1'
                        >
                          <CalendarAlert className='w-3 h-3' />
                          Expires {item.daysToExpiry !== undefined ? `in ${item.daysToExpiry}d` : 'Soon'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className='py-3 pr-5 text-right'>
                      <Button
                        size='sm'
                        variant='outline'
                        asChild
                        className='h-7 px-2.5 text-xs gap-1 hover:bg-primary hover:text-primary-foreground transition-all'
                      >
                        <Link to='/purchase-orders'>
                          <ShoppingCart className='w-3 h-3' />
                          <span>Reorder</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredAlerts.length > 15 && (
          <div className='p-3 text-center border-t border-border/40 text-xs text-muted-foreground'>
            Showing 15 of {filteredAlerts.length} total alerts.{' '}
            <Link to='/inventory-valuation' className='text-primary hover:underline font-medium'>
              View full inventory table <ArrowRight className='w-3 h-3 inline ml-0.5' />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
