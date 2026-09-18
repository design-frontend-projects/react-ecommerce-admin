import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Search,
  Building2,
  Calendar,
  Warehouse,
  LayoutGrid,
  Table as TableIcon,
  X,
  Eye,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWarehouses } from '@/features/warehouses/hooks/use-warehouses'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { getPOColumns } from './po-columns'
import { POStatusBadge } from './po-status-badge'
import { PORowActions } from './po-row-actions'
import { usePOContext } from './po-provider'
import { useCurrencies } from '@/features/currencies/hooks/use-currencies'

interface POTableProps {
  data: PurchaseOrder[]
  externalStatusFilter?: string | null
  onStatusFilterChange?: (status: string | null) => void
}

export function POTable({
  data = [],
  externalStatusFilter,
  onStatusFilterChange,
}: POTableProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = usePOContext()
  const { data: warehouses = [] } = useWarehouses()
  const { data: currencies = [] } = useCurrencies({ onlyActive: true })

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [statusFilter, setStatusFilter] = useState<string>(
    externalStatusFilter || 'all'
  )
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [currencyFilter, setCurrencyFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Keep internal status filter in sync with parent executive analytics card clicks
  useEffect(() => {
    if (externalStatusFilter !== undefined && externalStatusFilter !== null) {
      setStatusFilter(externalStatusFilter)
    }
  }, [externalStatusFilter])

  const handleStatusChange = (val: string) => {
    setStatusFilter(val)
    onStatusFilterChange?.(val === 'all' ? null : val)
  }

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((po) => {
      // 1. Status filter
      if (statusFilter !== 'all') {
        const st = String(po.lifecycle_status ?? po.status).toLowerCase()
        if (statusFilter === 'pending') {
          if (!['draft', 'pending', 'approved'].includes(st)) return false
        } else if (statusFilter === 'partial') {
          if (!['sent', 'partial', 'partially_received'].includes(st)) return false
        } else if (statusFilter === 'received') {
          if (!['received', 'closed'].includes(st)) return false
        } else if (st !== statusFilter) {
          return false
        }
      }

      // 2. Warehouse filter
      if (warehouseFilter !== 'all') {
        if (po.warehouse_id !== warehouseFilter) return false
      }

      // 3. Currency filter
      if (currencyFilter !== 'all') {
        const poCurrency = (po.currency || po.currencies?.code || '').toLowerCase()
        if (poCurrency !== currencyFilter.toLowerCase()) return false
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const supplierName = po.suppliers?.name?.toLowerCase() || ''
        const poNum = String(po.po_number ?? po.po_id).toLowerCase()
        const notes = (po.notes || '').toLowerCase()
        const whName = (po.warehouses?.name || '').toLowerCase()
        if (
          !supplierName.includes(q) &&
          !poNum.includes(q) &&
          !notes.includes(q) &&
          !whName.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [data, statusFilter, warehouseFilter, currencyFilter, searchQuery])

  const columns = useMemo(() => getPOColumns(t), [t])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const hasActiveFilters =
    statusFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    currencyFilter !== 'all' ||
    searchQuery.trim() !== ''

  const handleResetFilters = () => {
    setStatusFilter('all')
    setWarehouseFilter('all')
    setCurrencyFilter('all')
    setSearchQuery('')
    onStatusFilterChange?.(null)
  }

  return (
    <div className='space-y-4'>
      {/* ─── Filter & Toolbar ─────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 p-3 sm:p-4 rounded-xl border'>
        <div className='flex flex-1 flex-wrap items-center gap-2.5'>
          {/* Search */}
          <div className='relative flex-1 min-w-[200px] max-w-sm'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t(
                'purchaseOrders.searchPlaceholder',
                'Search PO #, supplier, warehouse...'
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 h-9 text-xs sm:text-sm bg-background'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>

          {/* Status Select */}
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className='w-[145px] sm:w-[160px] h-9 text-xs sm:text-sm bg-background'>
              <SelectValue placeholder={t('purchaseOrders.columns.status', 'Status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>
                {t('purchaseOrders.allStatuses', 'All Statuses')}
              </SelectItem>
              <SelectItem value='pending'>
                {t('purchaseOrders.statusFilter.pending', 'Draft & Pending')}
              </SelectItem>
              <SelectItem value='partial'>
                {t('purchaseOrders.statusFilter.partial', 'Inbound & Partial')}
              </SelectItem>
              <SelectItem value='received'>
                {t('purchaseOrders.statusFilter.received', 'Received & Closed')}
              </SelectItem>
              <SelectItem value='cancelled'>
                {t('purchaseOrders.status.cancelled', 'Cancelled')}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Warehouse Select */}
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className='w-[145px] sm:w-[170px] h-9 text-xs sm:text-sm bg-background'>
              <SelectValue
                placeholder={t('purchaseOrders.destination', 'Destination')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>
                {t('purchaseOrders.allWarehouses', 'All Destinations')}
              </SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Currency Select Filter */}
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className='w-[130px] sm:w-[150px] h-9 text-xs sm:text-sm bg-background'>
              <SelectValue
                placeholder={t('purchaseOrders.currencyFilter', 'Currency')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>
                {t('purchaseOrders.allCurrencies', 'All Currencies')}
              </SelectItem>
              {currencies.map((c) => (
                <SelectItem key={c.id} value={c.code}>
                  <span className='font-mono font-bold'>{c.symbol}</span>{' '}
                  <span className='font-mono text-xs'>{c.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResetFilters}
              className='h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground'
            >
              <X className='mr-1 h-3.5 w-3.5' />
              {t('common.reset', 'Reset')}
            </Button>
          )}
        </div>

        {/* View Switcher (Desktop/Tablet) */}
        <div className='flex items-center gap-1.5 self-end sm:self-auto'>
          <div className='hidden sm:flex items-center rounded-lg border bg-muted/40 p-0.5'>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('table')}
              className='h-7 px-2.5 text-xs'
            >
              <TableIcon className='h-3.5 w-3.5 mr-1.5' />
              {t('common.table', 'Table')}
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('cards')}
              className='h-7 px-2.5 text-xs'
            >
              <LayoutGrid className='h-3.5 w-3.5 mr-1.5' />
              {t('common.cards', 'Cards')}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Mobile Cards View (< 768px or viewMode === 'cards') ─── */}
      <div className={viewMode === 'cards' ? 'block' : 'block md:hidden'}>
        {filteredData.length === 0 ? (
          <div className='rounded-xl border bg-card/50 p-8 text-center text-muted-foreground'>
            <p className='text-sm'>
              {t('purchaseOrders.noOrdersFound', 'No purchase orders found matching your filters.')}
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {table.getRowModel().rows.map((row) => {
              const po = row.original
              const poNum = po.po_number ?? po.po_id
              const poLabel = `PO-${String(poNum).padStart(4, '0')}`
              const total = Number(po.grand_total ?? po.total_amount ?? 0)
              const currency = po.currency || po.currencies?.code || 'USD'
              const symbol = po.currencies?.symbol || '$'
              const st = String(po.lifecycle_status ?? po.status).toLowerCase()
              const canReceive = ['pending', 'approved', 'sent', 'partial', 'partially_received'].includes(st)

              return (
                <Card
                  key={row.id}
                  className='border bg-card shadow-2xs hover:shadow-md transition-shadow'
                >
                  <CardContent className='p-4 space-y-3'>
                    {/* Header: PO# + Status + Menu */}
                    <div className='flex items-center justify-between'>
                      <button
                        type='button'
                        onClick={() => {
                          setCurrentRow(po)
                          setOpen('view')
                        }}
                        className='font-mono font-bold text-sm text-primary hover:underline'
                      >
                        {poLabel}
                      </button>
                      <div className='flex items-center gap-1.5'>
                        <Badge variant='outline' className='font-mono font-bold text-[11px] px-1.5 py-0'>
                          {symbol} {currency}
                        </Badge>
                        <POStatusBadge status={po.lifecycle_status ?? po.status} />
                        <PORowActions row={po} />
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className='space-y-1.5 text-xs text-muted-foreground pt-1 border-t'>
                      {/* Supplier */}
                      <div className='flex items-center justify-between'>
                        <span className='flex items-center gap-1.5'>
                          <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                          {t('purchaseOrders.fields.supplier', 'Supplier')}:
                        </span>
                        <span className='font-medium text-foreground max-w-[180px] truncate text-right'>
                          {po.suppliers?.name || '—'}
                        </span>
                      </div>

                      {/* Destination Warehouse */}
                      {po.warehouses?.name && (
                        <div className='flex items-center justify-between'>
                          <span className='flex items-center gap-1.5'>
                            <Warehouse className='h-3.5 w-3.5 text-primary/70' />
                            {t('purchaseOrders.fields.destination', 'Destination')}:
                          </span>
                          <span className='font-medium text-foreground max-w-[180px] truncate text-right'>
                            {po.warehouses.name}
                          </span>
                        </div>
                      )}

                      {/* Order Date */}
                      {po.order_date && (
                        <div className='flex items-center justify-between'>
                          <span className='flex items-center gap-1.5'>
                            <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                            {t('purchaseOrders.columns.orderDate', 'Order Date')}:
                          </span>
                          <span>
                            {format(new Date(po.order_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}

                      {/* Expected Delivery */}
                      {po.expected_delivery_date && (
                        <div className='flex items-center justify-between'>
                          <span>{t('purchaseOrders.columns.expectedDelivery', 'Expected')}:</span>
                          <span>
                            {format(new Date(po.expected_delivery_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Items count & Total & Quick Action */}
                    <div className='flex items-center justify-between pt-2 border-t'>
                      <div>
                        <span className='text-[11px] text-muted-foreground'>
                          {t('purchaseOrders.totalValue', 'Total Value')}
                        </span>
                        <p className='font-mono font-bold text-sm sm:text-base text-foreground'>
                          {symbol}{total.toFixed(2)}{' '}
                          <span className='text-[10px] text-muted-foreground font-normal'>
                            {currency}
                          </span>
                        </p>
                      </div>

                      <div className='flex items-center gap-1.5'>
                        {canReceive && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setCurrentRow(po)
                              setOpen('receive')
                            }}
                            className='h-8 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          >
                            <PackageCheck className='h-3.5 w-3.5 mr-1' />
                            {t('purchaseOrders.actions.receive', 'Receive')}
                          </Button>
                        )}
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() => {
                            setCurrentRow(po)
                            setOpen('view')
                          }}
                          className='h-8 text-xs'
                        >
                          <Eye className='h-3.5 w-3.5 mr-1' />
                          {t('common.details', 'Details')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Desktop Table View (>= 768px and viewMode === 'table') ─── */}
      <div className={viewMode === 'table' ? 'hidden md:block' : 'hidden'}>
        <div className='rounded-xl border bg-card overflow-hidden shadow-2xs'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='bg-muted/30 hover:bg-muted/30'>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className='text-xs font-semibold py-3'>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className='transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='py-2.5 text-xs sm:text-sm'>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-32 text-center text-muted-foreground'
                  >
                    {t('purchaseOrders.noOrdersFound', 'No purchase orders found matching your filters.')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Pagination ──────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-muted-foreground'>
        <p>
          {t('purchaseOrders.showingCount', 'Showing {{count}} of {{total}} purchase order(s)', {
            count: table.getFilteredRowModel().rows.length,
            total: data.length,
          })}
        </p>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className='h-8 px-2.5 text-xs'
          >
            <ChevronLeft className='h-3.5 w-3.5 mr-1' />
            {t('common.previous', 'Previous')}
          </Button>
          <div className='text-xs font-medium text-foreground px-2'>
            {table.getState().pagination.pageIndex + 1} /{' '}
            {Math.max(1, table.getPageCount())}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className='h-8 px-2.5 text-xs'
          >
            {t('common.next', 'Next')}
            <ChevronRight className='h-3.5 w-3.5 ml-1' />
          </Button>
        </div>
      </div>
    </div>
  )
}
