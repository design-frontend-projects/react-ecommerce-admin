import { Link } from '@tanstack/react-router'
import { Clock, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { OverduePurchaseOrder, DashboardCurrency } from '../types'

interface OverduePoTableProps {
  orders: OverduePurchaseOrder[]
  currency: DashboardCurrency
}

export function OverduePoTable({ orders, currency }: OverduePoTableProps) {
  const formatMoney = (val: number, cur?: string) => {
    const symbol = cur || currency.symbol
    return `${symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return (
    <Card className='border border-border/60 bg-card/60 backdrop-blur-md shadow-xs flex flex-col'>
      <CardHeader className='p-5 pb-3 flex flex-row items-center justify-between gap-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <Clock className='w-4 h-4 text-purple-500' />
            <CardTitle className='text-base font-semibold text-foreground'>
              Delayed Supplier Deliveries
            </CardTitle>
            {orders.length > 0 && (
              <Badge variant='outline' className='bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs font-semibold'>
                {orders.length} Overdue
              </Badge>
            )}
          </div>
          <CardDescription className='text-xs text-muted-foreground'>
            Active purchase orders past their expected warehouse receipt dates
          </CardDescription>
        </div>

        <Button variant='ghost' size='sm' asChild className='h-8 text-xs font-medium text-muted-foreground hover:text-foreground'>
          <Link to='/purchase-orders'>
            All Orders <ArrowRight className='w-3 h-3 ml-1' />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className='p-0 flex-1 flex flex-col justify-between'>
        {orders.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground my-auto'>
            <CheckCircle2 className='w-8 h-8 text-emerald-500 mb-2 opacity-80' />
            <p className='text-sm font-semibold text-foreground'>No Delayed Orders</p>
            <p className='text-xs max-w-xs'>
              All open vendor shipments are either on schedule or have already been fully received.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-muted/40 text-[11px] uppercase tracking-wider'>
                <TableRow className='hover:bg-transparent border-border/40'>
                  <TableHead className='py-2.5 pl-5'>PO # & Supplier</TableHead>
                  <TableHead className='py-2.5'>Expected Date</TableHead>
                  <TableHead className='py-2.5'>Delay</TableHead>
                  <TableHead className='py-2.5'>Amount</TableHead>
                  <TableHead className='py-2.5 pr-5 text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-xs divide-y divide-border/30'>
                {orders.slice(0, 6).map((po) => (
                  <TableRow key={po.id} className='hover:bg-muted/30 transition-colors'>
                    {/* PO Number & Supplier */}
                    <TableCell className='py-3 pl-5'>
                      <div className='space-y-0.5 max-w-[160px] truncate'>
                        <span className='font-bold text-foreground block font-mono text-xs'>
                          {po.poNumber}
                        </span>
                        <span className='text-[11px] text-muted-foreground block truncate' title={po.supplierName}>
                          {po.supplierName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Expected Date */}
                    <TableCell className='py-3 text-muted-foreground font-mono text-[11px]'>
                      {po.expectedDeliveryDate || 'N/A'}
                    </TableCell>

                    {/* Delay Badge */}
                    <TableCell className='py-3'>
                      <Badge
                        variant='outline'
                        className={`text-[10px] font-semibold gap-1 ${
                          po.daysOverdue >= 14
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        <Clock className='w-2.5 h-2.5' />
                        {po.daysOverdue}d Late
                      </Badge>
                    </TableCell>

                    {/* Total Amount */}
                    <TableCell className='py-3 font-semibold text-foreground text-xs'>
                      {formatMoney(po.totalAmount, po.currency)}
                    </TableCell>

                    {/* Action */}
                    <TableCell className='py-3 pr-5 text-right'>
                      <Button
                        size='sm'
                        variant='ghost'
                        asChild
                        className='h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10'
                      >
                        <Link to='/purchase-orders'>
                          <span>Inspect</span>
                          <ExternalLink className='w-3 h-3' />
                        </Link>
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
  )
}
