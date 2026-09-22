import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Printer,
  ArrowLeft,
  Search,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Package,
  ExternalLink,
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useOrders } from '../hooks/use-sales-orders'
import { OrderStatusBadge } from '../components/columns'
import { customerName } from '../data/schema'

export function SalesOrderReportsPage() {
  const { t } = useTranslation()
  const { data: orders = [], isLoading } = useOrders()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        order.order_number.toLowerCase().includes(q) ||
        customerName(order.customers).toLowerCase().includes(q) ||
        (order.stores?.name && order.stores.name.toLowerCase().includes(q))

      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, selectedStatus])

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0)
    const confirmedOrders = orders.filter((o) =>
      ['confirmed', 'picking', 'packed'].includes(o.status)
    ).length
    const fulfilledOrders = orders.filter((o) =>
      ['delivered', 'completed', 'invoiced'].includes(o.status)
    ).length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return {
      totalOrders,
      totalRevenue,
      confirmedOrders,
      fulfilledOrders,
      avgOrderValue,
    }
  }, [orders])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val)
  }

  const handlePrintSummary = () => {
    window.print()
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <FileText className='h-5 w-5 text-primary' />
          <h1 className='text-lg font-semibold tracking-tight'>
            {t('salesOrders.reports.title', 'Sales Order Reports & Analytics')}
          </h1>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 pb-12 print:p-0 print:m-0'>
        {/* Top Header & Breadcrumbs (Screen Only) */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden'>
          <div className='flex items-center gap-3'>
            <Button variant='outline' size='sm' asChild className='h-8 text-xs'>
              <Link to='/sales-orders'>
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' />
                {t('salesOrders.printPage.backToOrders', 'Sales Orders')}
              </Link>
            </Button>
            <div>
              <h2 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
                {t('salesOrders.reports.heading', 'Fulfillment & Commercial Reports')}
              </h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {t(
                  'salesOrders.reports.subheading',
                  'Auditing, order pipeline revenue, warehouse pick & pack slips, and commercial invoices.'
                )}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={handlePrintSummary}
            >
              <Printer className='mr-1.5 h-4 w-4' />
              {t('salesOrders.reports.printOverview', 'Print Overview')}
            </Button>
          </div>
        </div>

        {/* Executive Overview KPI Strip */}
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5'>
          {/* Total Orders */}
          <div className='rounded-xl border bg-card p-4 shadow-xs space-y-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground'>Total Orders</span>
              <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
                <FileText className='h-4 w-4' />
              </div>
            </div>
            <p className='text-2xl font-bold tracking-tight text-foreground'>
              {metrics.totalOrders}
            </p>
            <p className='text-[11px] text-muted-foreground'>Registered sales orders</p>
          </div>

          {/* Pipeline Revenue */}
          <div className='rounded-xl border bg-card p-4 shadow-xs space-y-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground'>Total Pipeline</span>
              <div className='p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                <DollarSign className='h-4 w-4' />
              </div>
            </div>
            <p className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
              {formatCurrency(metrics.totalRevenue)}
            </p>
            <p className='text-[11px] text-muted-foreground'>Gross order revenue</p>
          </div>

          {/* In Processing */}
          <div className='rounded-xl border bg-card p-4 shadow-xs space-y-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground'>Processing</span>
              <div className='p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400'>
                <Clock className='h-4 w-4' />
              </div>
            </div>
            <p className='text-2xl font-bold tracking-tight text-foreground'>
              {metrics.confirmedOrders}
            </p>
            <p className='text-[11px] text-muted-foreground'>Confirmed, pick & pack</p>
          </div>

          {/* Fulfilled */}
          <div className='rounded-xl border bg-card p-4 shadow-xs space-y-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground'>Fulfilled</span>
              <div className='p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                <CheckCircle2 className='h-4 w-4' />
              </div>
            </div>
            <p className='text-2xl font-bold tracking-tight text-foreground'>
              {metrics.fulfilledOrders}
            </p>
            <p className='text-[11px] text-muted-foreground'>Dispatched or invoiced</p>
          </div>

          {/* Average Order Value */}
          <div className='rounded-xl border bg-card p-4 shadow-xs space-y-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground'>Avg Order Value</span>
              <div className='p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'>
                <TrendingUp className='h-4 w-4' />
              </div>
            </div>
            <p className='text-2xl font-bold tracking-tight text-foreground'>
              {formatCurrency(metrics.avgOrderValue)}
            </p>
            <p className='text-[11px] text-muted-foreground'>Average basket size</p>
          </div>
        </div>

        {/* Filter and Search Bar (Screen Only) */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-2xs print:hidden'>
          <div className='relative w-full sm:w-80'>
            <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder={t('salesOrders.reports.searchPlaceholder', 'Search order #, customer, store...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 h-9 text-xs'
            />
          </div>

          <div className='flex items-center gap-2 w-full sm:w-auto'>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className='h-9 text-xs w-44'>
                <SelectValue placeholder='Status Filter' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='confirmed'>Confirmed</SelectItem>
                <SelectItem value='picking'>In Picking</SelectItem>
                <SelectItem value='packed'>Packed</SelectItem>
                <SelectItem value='delivered'>Delivered</SelectItem>
                <SelectItem value='invoiced'>Invoiced</SelectItem>
                <SelectItem value='completed'>Completed</SelectItem>
                <SelectItem value='cancelled'>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Orders Report Table */}
        <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
          <div className='p-4 border-b bg-muted/20 flex items-center justify-between'>
            <div className='space-y-0.5'>
              <h3 className='text-sm font-bold tracking-tight text-foreground'>
                {t('salesOrders.reports.ordersListTitle', 'Order Reports Ledger')}
              </h3>
              <p className='text-xs text-muted-foreground'>
                Showing {filteredOrders.length} of {orders.length} total orders
              </p>
            </div>
          </div>

          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/30'>
                  <TableHead className='w-32'>Order #</TableHead>
                  <TableHead className='w-28'>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store & Logistics</TableHead>
                  <TableHead className='w-28'>Status</TableHead>
                  <TableHead className='text-right w-28'>Amount</TableHead>
                  <TableHead className='text-right w-44 print:hidden'>Print Reports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-32 text-center text-sm text-muted-foreground'>
                      <div className='flex items-center justify-center gap-2'>
                        <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                        <span>Loading orders...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-32 text-center text-sm text-muted-foreground'>
                      No sales orders found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className='hover:bg-muted/30'>
                      <TableCell className='font-mono font-bold text-xs'>
                        <Link
                          to='/sales-orders/$orderId/print'
                          params={{ orderId: order.id }}
                          className='text-primary hover:underline flex items-center gap-1'
                        >
                          {order.order_number}
                          <ExternalLink className='h-3 w-3 opacity-60' />
                        </Link>
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {order.order_date
                          ? format(new Date(order.order_date), 'MMM dd, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className='text-xs'>
                        <span className='font-semibold text-foreground block'>
                          {customerName(order.customers)}
                        </span>
                        {order.customers?.phone && (
                          <span className='text-[11px] text-muted-foreground block'>
                            {order.customers.phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-xs'>
                        <span className='text-foreground font-medium block'>
                          {order.stores?.name || 'N/A'}
                        </span>
                        {order.channels?.name && (
                          <span className='text-[11px] text-muted-foreground block'>
                            Channel: {order.channels.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className='text-right font-mono font-bold text-xs'>
                        {order.currency} {Number(order.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className='text-right print:hidden'>
                        <div className='flex items-center justify-end gap-1.5'>
                          <Button
                            variant='outline'
                            size='sm'
                            asChild
                            className='h-7 text-xs px-2'
                            title='Print Commercial Order Report'
                          >
                            <Link
                              to='/sales-orders/$orderId/print'
                              params={{ orderId: order.id }}
                              search={{ template: 'commercial', autoPrint: 'true' }}
                              target='_blank'
                            >
                              <Printer className='h-3 w-3 mr-1 text-primary' />
                              Commercial
                            </Link>
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            asChild
                            className='h-7 text-xs px-2'
                            title='Print Warehouse Packing Slip'
                          >
                            <Link
                              to='/sales-orders/$orderId/print'
                              params={{ orderId: order.id }}
                              search={{ template: 'packing_slip', autoPrint: 'true' }}
                              target='_blank'
                            >
                              <Package className='h-3 w-3 mr-1 text-purple-600' />
                              Slip
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Main>
    </>
  )
}
