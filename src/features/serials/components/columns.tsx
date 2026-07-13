import { type ColumnDef } from '@tanstack/react-table'
import { History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import type { SerialListItem, SerialStatus } from '../data/schema'

const STATUS_VARIANT: Record<
  SerialStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  in_stock: 'default',
  reserved: 'secondary',
  sold: 'outline',
  returned: 'secondary',
  damaged: 'destructive',
  in_transit: 'secondary',
  written_off: 'destructive',
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function createColumns(
  onTrail: (row: SerialListItem) => void
): ColumnDef<SerialListItem>[] {
  return [
    {
      accessorKey: 'serial_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Serial' />
      ),
      cell: ({ row }) => (
        <span className='font-mono font-medium'>
          {row.original.serial_number}
        </span>
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
      id: 'batch',
      header: 'Batch',
      cell: ({ row }) => row.original.product_batches?.batch_number ?? '—',
    },
    {
      id: 'store',
      header: 'Store',
      cell: ({ row }) => row.original.stores?.name ?? '—',
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>
          {row.original.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'received_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Received' />
      ),
      cell: ({ row }) => formatDateTime(row.original.received_at),
    },
    {
      accessorKey: 'sold_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Sold' />
      ),
      cell: ({ row }) => formatDateTime(row.original.sold_at),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => onTrail(row.original)}
        >
          <History className='me-1 h-4 w-4' />
          Trail
        </Button>
      ),
    },
  ]
}
