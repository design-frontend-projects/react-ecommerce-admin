import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  Layers,
  Receipt,
  RotateCcw,
  Search as SearchIcon,
} from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrencyOptions } from '@/hooks/use-inventory-lookups'
import type { FinancialTransactionRow } from '../data/schema'
import { columns } from './columns'
import { useTransactionsContext } from './transactions-provider'

interface TransactionsTableProps {
  data: FinancialTransactionRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  isLoading?: boolean
}

export function TransactionsTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
  isLoading = false,
}: TransactionsTableProps) {
  const { t } = useTranslation()
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    currencyFilter,
    setCurrencyFilter,
    activeTab,
    setActiveTab,
    setPage,
  } = useTransactionsContext()

  const { data: currencies = [] } = useCurrencyOptions()

  // Filter based on active quick tab
  const filteredData = useMemo(() => {
    if (activeTab === 'inflow') {
      return data.filter((t) =>
        ['sale', 'income', 'payment_in', 'opening_balance'].includes(
          t.transaction_type
        )
      )
    }
    if (activeTab === 'outflow') {
      return data.filter((t) =>
        ['purchase', 'expense', 'payment_out'].includes(t.transaction_type)
      )
    }
    if (activeTab === 'payments') {
      return data.filter((t) =>
        ['payment_in', 'payment_out'].includes(t.transaction_type)
      )
    }
    if (activeTab === 'refunds') {
      return data.filter(
        (t) =>
          t.transaction_type === 'refund' ||
          t.status === 'refunded' ||
          t.status === 'partially_refunded'
      )
    }
    if (activeTab === 'pending') {
      return data.filter(
        (t) => t.status === 'pending' || t.status === 'draft'
      )
    }
    return data
  }, [data, activeTab])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  return (
    <div className='space-y-4'>
      {/* Quick Category Tabs */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val)
            setPage(1)
          }}
          className='w-full sm:w-auto'
        >
          <TabsList className='grid grid-cols-3 sm:flex w-full sm:w-auto h-9 p-1'>
            <TabsTrigger value='all' className='text-xs px-3'>
              <Layers className='mr-1.5 h-3.5 w-3.5' />
              All
            </TabsTrigger>
            <TabsTrigger value='inflow' className='text-xs px-3'>
              <ArrowDownLeft className='mr-1.5 h-3.5 w-3.5 text-emerald-500' />
              Inflow
            </TabsTrigger>
            <TabsTrigger value='outflow' className='text-xs px-3'>
              <ArrowUpRight className='mr-1.5 h-3.5 w-3.5 text-rose-500' />
              Outflow
            </TabsTrigger>
            <TabsTrigger value='payments' className='text-xs px-3'>
              <CreditCard className='mr-1.5 h-3.5 w-3.5 text-teal-500' />
              Payments
            </TabsTrigger>
            <TabsTrigger value='refunds' className='text-xs px-3'>
              <RotateCcw className='mr-1.5 h-3.5 w-3.5 text-purple-500' />
              Refunds
            </TabsTrigger>
            <TabsTrigger value='pending' className='text-xs px-3'>
              <Receipt className='mr-1.5 h-3.5 w-3.5 text-amber-500' />
              Pending
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filter and Search Toolbar */}
      <div className='flex flex-wrap items-center gap-2.5 rounded-xl border bg-card/50 p-2.5'>
        {/* Search */}
        <div className='relative flex-1 min-w-[200px]'>
          <SearchIcon className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t(
              'transactions.searchPlaceholder',
              'Search by transaction # or notes...'
            )}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className='pl-8 h-9 text-xs'
          />
        </div>

        {/* Transaction Type Filter */}
        <Select
          value={typeFilter}
          onValueChange={(val) => {
            setTypeFilter(val)
            setPage(1)
          }}
        >
          <SelectTrigger className='w-[140px] h-9 text-xs'>
            <Filter className='mr-1.5 h-3.5 w-3.5 text-muted-foreground' />
            <SelectValue placeholder='All Types' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>All Types</SelectItem>
            <SelectItem value='sale'>Sale</SelectItem>
            <SelectItem value='purchase'>Purchase</SelectItem>
            <SelectItem value='payment_in'>Payment In</SelectItem>
            <SelectItem value='payment_out'>Payment Out</SelectItem>
            <SelectItem value='refund'>Refund</SelectItem>
            <SelectItem value='expense'>Expense</SelectItem>
            <SelectItem value='income'>Income</SelectItem>
            <SelectItem value='opening_balance'>Opening Balance</SelectItem>
            <SelectItem value='adjustment'>Adjustment</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val)
            setPage(1)
          }}
        >
          <SelectTrigger className='w-[130px] h-9 text-xs'>
            <SelectValue placeholder='All Statuses' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>All Statuses</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='refunded'>Refunded</SelectItem>
            <SelectItem value='partially_refunded'>Partial Refund</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
            <SelectItem value='voided'>Voided</SelectItem>
          </SelectContent>
        </Select>

        {/* Currency Filter */}
        <Select
          value={currencyFilter}
          onValueChange={(val) => {
            setCurrencyFilter(val)
            setPage(1)
          }}
        >
          <SelectTrigger className='w-[120px] h-9 text-xs'>
            <SelectValue placeholder='Currency' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>All Currencies</SelectItem>
            {currencies.map((c) => (
              <SelectItem key={c.id || c.code} value={c.code}>
                {c.code} ({c.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table Surface */}
      <div className='rounded-xl border bg-card/60 shadow-xs overflow-hidden'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='bg-muted/40 hover:bg-muted/40'>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='h-10 text-xs font-semibold'>
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
            {isLoading ? (
              Array.from({ length: 6 }).map((_, rIdx) => (
                <TableRow key={rIdx}>
                  {columns.map((_, cIdx) => (
                    <TableCell key={cIdx} className='py-3'>
                      <Skeleton className='h-4 w-full max-w-[120px]' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='hover:bg-muted/30 transition-colors'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='py-2.5 text-xs'>
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
                  <div className='flex flex-col items-center justify-center space-y-1.5'>
                    <Receipt className='h-8 w-8 text-muted-foreground/50' />
                    <p className='font-medium text-sm text-foreground'>
                      No transactions found
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Try adjusting your search query, type filter, or status criteria.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground'>
          <div>
            Showing{' '}
            <span className='font-medium text-foreground'>
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className='font-medium text-foreground'>
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className='font-medium text-foreground'>{total}</span>{' '}
            transactions
          </div>

          <div className='flex items-center space-x-1.5'>
            <Button
              variant='outline'
              size='sm'
              className='h-7 w-7 p-0'
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className='h-3.5 w-3.5' />
            </Button>
            <span className='px-2 text-xs font-medium text-foreground'>
              Page {page} of {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              className='h-7 w-7 p-0'
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
