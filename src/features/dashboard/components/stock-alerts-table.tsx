import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  AlertOctagon,
  CalendarX,
  CalendarClock,
  Search,
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StockAlertItem, DashboardCurrency } from '../types'

interface StockAlertsTableProps {
  alerts: StockAlertItem[]
  currency: DashboardCurrency
  initialFilter?: string
}

export function StockAlertsTable({
  alerts,
  initialFilter = 'all',
}: StockAlertsTableProps) {
  const [filterTab, setFilterTab] = useState<string>(initialFilter)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Tab filter
      if (filterTab === 'out_of_stock' && item.status !== 'out_of_stock')
        return false
      if (filterTab === 'low_stock' && item.status !== 'low_stock') return false
      if (
        filterTab === 'expiry' &&
        item.status !== 'expiring' &&
        item.status !== 'expired'
      )
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

  const outOfStockCount = alerts.filter(
    (a) => a.status === 'out_of_stock'
  ).length
  const lowStockCount = alerts.filter((a) => a.status === 'low_stock').length
  const expiryCount = alerts.filter(
    (a) => a.status === 'expiring' || a.status === 'expired'
  ).length

  return (
    <Card className='border border-border/60 bg-card/60 shadow-xs backdrop-blur-md'>
      <CardHeader className='flex flex-col justify-between gap-4 p-5 pb-3 sm:flex-row sm:items-center'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4 text-amber-500' />
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
            <Search className='absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search alerts...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-8 border-border/60 bg-background/60 pl-8 text-xs'
            />
          </div>

          <div className='flex items-center rounded-lg border border-border/40 bg-muted/60 p-0.5'>
            <button
              type='button'
              onClick={() => setFilterTab('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
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
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
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
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
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
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
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
            <ShieldCheck className='mb-2 h-8 w-8 text-emerald-500' />
            <p className='text-sm font-semibold text-foreground'>
              No alerts found
            </p>
            <p className='text-xs'>
              All products in this category meet safe inventory thresholds.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-muted/40 text-[11px] tracking-wider uppercase'>
                <TableRow className='border-border/40 hover:bg-transparent'>
                  <TableHead className='py-2.5 pl-5'>Product & SKU</TableHead>
                  <TableHead className='py-2.5'>Category / Warehouse</TableHead>
                  <TableHead className='py-2.5'>Stock Level</TableHead>
                  <TableHead className='py-2.5'>Condition / Urgency</TableHead>
                  <TableHead className='py-2.5 pr-5 text-right'>
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y divide-border/30 text-xs'>
                {filteredAlerts.slice(0, 15).map((item) => (
                  <TableRow
                    key={`${item.id}-${item.status}`}
                    className='transition-colors hover:bg-muted/30'
                  >
                    {/* Product & SKU */}
                    <TableCell className='py-3 pl-5'>
                      <div className='max-w-[220px] space-y-0.5 sm:max-w-xs'>
                        <span
                          className='block truncate font-semibold text-foreground'
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <div className='flex items-center gap-2 font-mono text-[11px] text-muted-foreground'>
                          <span>SKU: {item.sku}</span>
                          {item.batchNumber && (
                            <span className='py-0.2 rounded bg-muted px-1 text-[10px]'>
                              Batch: {item.batchNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Category & Warehouse */}
                    <TableCell className='py-3'>
                      <div className='space-y-0.5 text-muted-foreground'>
                        <span className='block text-xs font-medium text-foreground'>
                          {item.categoryName}
                        </span>
                        <span className='block max-w-[130px] truncate text-[11px] text-muted-foreground'>
                          {item.warehouseName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Stock Level */}
                    <TableCell className='py-3'>
                      <div className='min-w-[120px] space-y-1'>
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
                          <span className='text-[10px] text-muted-foreground'>
                            Min: {item.minQuantity}
                          </span>
                        </div>
                        {/* Mini visual fill bar */}
                        <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
                          <div
                            className={`h-full rounded-full ${
                              item.qtyAvailable <= 0
                                ? 'w-0 bg-red-500'
                                : item.qtyAvailable <= item.minQuantity
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  10,
                                  (item.qtyAvailable /
                                    Math.max(1, item.minQuantity * 2)) *
                                    100
                                )
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
                          className='gap-1 border-red-500/30 bg-red-500/10 text-[11px] text-red-600 dark:text-red-400'
                        >
                          <AlertOctagon className='h-3 w-3' />
                          Out of Stock
                        </Badge>
                      )}
                      {item.status === 'low_stock' && (
                        <Badge
                          variant='outline'
                          className='gap-1 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-600 dark:text-amber-400'
                        >
                          <AlertTriangle className='h-3 w-3' />
                          Low Stock
                        </Badge>
                      )}
                      {item.status === 'expired' && (
                        <Badge
                          variant='outline'
                          className='gap-1 border-rose-500/30 bg-rose-500/10 text-[11px] text-rose-600 dark:text-rose-400'
                        >
                          <CalendarX className='h-3 w-3' />
                          Expired
                        </Badge>
                      )}
                      {item.status === 'expiring' && (
                        <Badge
                          variant='outline'
                          className='gap-1 border-orange-500/30 bg-orange-500/10 text-[11px] text-orange-600 dark:text-orange-400'
                        >
                          <CalendarClock className='h-3 w-3' />
                          Expires{' '}
                          {item.daysToExpiry !== undefined
                            ? `in ${item.daysToExpiry}d`
                            : 'Soon'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className='py-3 pr-5 text-right'>
                      <Button
                        size='sm'
                        variant='outline'
                        asChild
                        className='h-7 gap-1 px-2.5 text-xs transition-all hover:bg-primary hover:text-primary-foreground'
                      >
                        <Link to='/purchase-orders'>
                          <ShoppingCart className='h-3 w-3' />
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
          <div className='border-t border-border/40 p-3 text-center text-xs text-muted-foreground'>
            Showing 15 of {filteredAlerts.length} total alerts.{' '}
            <Link
              to='/inventory/valuation'
              className='font-medium text-primary hover:underline'
            >
              View full inventory table{' '}
              <ArrowRight className='ml-0.5 inline h-3 w-3' />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
