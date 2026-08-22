import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import type { SalesShipmentListItem, ShipmentStatus } from '../data/schema'
import { SalesShipmentRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  ShipmentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  confirmed: 'secondary',
  picking: 'secondary',
  packed: 'secondary',
  delivered: 'default',
  invoiced: 'default',
  completed: 'default',
  cancelled: 'destructive',
}

export const columns: ColumnDef<SalesShipmentListItem>[] = [
  {
    accessorKey: 'shipment_no',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Shipment #' />
    ),
    cell: ({ row }) => (
      <span className='font-mono font-medium'>{row.original.shipment_no}</span>
    ),
  },
  {
    id: 'warehouse',
    header: 'Fulfillment Warehouse',
    cell: ({ row }) =>
      row.original.warehouses
        ? `${row.original.warehouses.name} (${row.original.warehouses.code})`
        : '—',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status] ?? 'outline'}
        className='capitalize'
      >
        {row.original.status}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'shipped_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Shipped Date' />
    ),
    cell: ({ row }) =>
      row.original.shipped_at
        ? new Date(row.original.shipped_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Pending dispatch',
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) => <SalesShipmentRowActions row={row.original} />,
  },
]
