import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { BatchRowActions } from './row-actions'
import type { BatchListItem, BatchStatus } from '../data/schema'

const STATUS_VARIANT: Record<
  BatchStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  depleted: 'outline',
  expired: 'destructive',
  blocked: 'secondary',
}

const DAY_MS = 24 * 60 * 60 * 1000

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ExpiryCell({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span>—</span>

  const expiry = new Date(expiryDate)
  const now = new Date()
  const isExpired = expiry.getTime() < now.getTime()
  const expiresSoon =
    !isExpired && expiry.getTime() - now.getTime() <= 30 * DAY_MS

  return (
    <div className='flex items-center gap-2'>
      <span>{formatDate(expiryDate)}</span>
      {isExpired ? <Badge variant='destructive'>Expired</Badge> : null}
      {expiresSoon ? <Badge variant='secondary'>Expires soon</Badge> : null}
    </div>
  )
}

export const columns: ColumnDef<BatchListItem>[] = [
  {
    accessorKey: 'batch_number',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Batch' />
    ),
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.batch_number}</span>
    ),
  },
  {
    id: 'product',
    header: 'Product',
    cell: ({ row }) => {
      const variant = row.original.product_variants
      if (!variant) return '—'
      return variant.products?.name
        ? `${variant.sku} — ${variant.products.name}`
        : variant.sku
    },
  },
  {
    id: 'supplier',
    header: 'Supplier',
    cell: ({ row }) => row.original.suppliers?.name ?? '—',
  },
  {
    accessorKey: 'manufacture_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Manufactured' />
    ),
    cell: ({ row }) => formatDate(row.original.manufacture_date),
  },
  {
    accessorKey: 'expiry_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Expiry' />
    ),
    cell: ({ row }) => <ExpiryCell expiryDate={row.original.expiry_date} />,
  },
  {
    accessorKey: 'qty_on_hand',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='On hand' />
    ),
    cell: ({ row }) => row.original.qty_on_hand,
  },
  {
    accessorKey: 'unit_cost',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Unit cost' />
    ),
    cell: ({ row }) => row.original.unit_cost,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status]}
        className='capitalize'
      >
        {row.original.status}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: 'actions',
    cell: ({ row }) => <BatchRowActions row={row.original} />,
  },
]
