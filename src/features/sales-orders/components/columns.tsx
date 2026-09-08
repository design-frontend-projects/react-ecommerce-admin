import { type ColumnDef } from '@tanstack/react-table'
import {
  FileText,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Receipt,
  XCircle,
  Warehouse,
  Building2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import {
  customerName,
  type OrderListItem,
  type OrderStatus,
} from '../data/schema'
import { OrderRowActions } from './row-actions'

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: {
    label: 'Draft',
    className: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    icon: FileText,
  },
  confirmed: {
    label: 'Confirmed',
    className: 'border-sky-300 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    icon: Clock,
  },
  picking: {
    label: 'Picking',
    className: 'border-amber-300 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    icon: Package,
  },
  packed: {
    label: 'Packed',
    className: 'border-violet-300 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    icon: Package,
  },
  delivered: {
    label: 'Delivered',
    className: 'border-cyan-300 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    icon: Truck,
  },
  invoiced: {
    label: 'Invoiced',
    className: 'border-indigo-300 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    icon: Receipt,
  },
  completed: {
    label: 'Completed',
    className: 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-rose-300 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    icon: XCircle,
  },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'border-border bg-muted text-muted-foreground',
    icon: Clock,
  }
  const Icon = config.icon

  return (
    <Badge
      variant='outline'
      className={`capitalize font-medium flex items-center gap-1.5 px-2 py-0.5 text-xs w-fit ${config.className}`}
    >
      <Icon className='h-3 w-3 shrink-0' />
      <span>{config.label}</span>
    </Badge>
  )
}

export const columns: ColumnDef<OrderListItem>[] = [
  {
    accessorKey: 'order_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Order #' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <div className='p-1 rounded bg-primary/10 text-primary'>
          <Receipt className='h-3.5 w-3.5' />
        </div>
        <span className='font-mono font-semibold text-foreground text-sm'>
          {row.original.order_number}
        </span>
      </div>
    ),
  },
  {
    id: 'customer',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Customer' />
    ),
    cell: ({ row }) => {
      const cust = row.original.customers
      const name = customerName(cust)
      return (
        <div className='flex flex-col'>
          <span className='font-medium text-foreground text-sm truncate'>
            {name}
          </span>
          {cust?.phone && (
            <span className='text-[11px] text-muted-foreground font-mono'>
              {cust.phone}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'store_warehouse',
    header: 'Store / Location',
    cell: ({ row }) => {
      const storeName = row.original.stores?.name
      const whName = row.original.warehouses?.name
      return (
        <div className='flex flex-col gap-0.5 text-xs'>
          <span className='flex items-center gap-1 text-foreground font-medium'>
            <Building2 className='h-3 w-3 text-muted-foreground' />
            {storeName || '—'}
          </span>
          {whName && (
            <span className='flex items-center gap-1 text-muted-foreground text-[11px]'>
              <Warehouse className='h-3 w-3 text-muted-foreground' />
              {whName}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'order_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Ordered Date' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col text-xs'>
        <span className='font-medium text-foreground'>
          {new Date(row.original.order_date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        {row.original.expected_date && (
          <span className='text-[11px] text-muted-foreground'>
            Exp: {new Date(row.original.expected_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total Amount' />
    ),
    cell: ({ row }) => {
      const curr = row.original.currency || 'USD'
      return (
        <div className='flex flex-col'>
          <span className='font-mono font-bold text-sm text-foreground tabular-nums'>
            ${row.original.total_amount.toFixed(2)}
          </span>
          {row.original.discount_amount > 0 && (
            <span className='text-[11px] text-rose-600 font-mono'>
              -${row.original.discount_amount.toFixed(2)} disc
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'items',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Items' />
    ),
    cell: ({ row }) => {
      const count = row.original._count?.sales_order_items ?? 0
      return (
        <Badge variant='outline' className='font-mono text-xs font-semibold'>
          {count} {count === 1 ? 'item' : 'items'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <OrderRowActions row={row.original} />,
  },
]
