import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import type { SuggestionListItem, SuggestionStatus } from '../data/schema'
import { SuggestionRowActions } from './row-actions'

const STATUS_VARIANT: Record<
  SuggestionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  open: 'default',
  converted: 'secondary',
  dismissed: 'outline',
  expired: 'destructive',
}

export const getColumns = (
  t: TFunction = ((key: string, def?: string) => def ?? key) as unknown as TFunction
): ColumnDef<SuggestionListItem>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t('replenishment.table.selectAll', 'Select all')}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t('replenishment.table.selectRow', 'Select row')}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'product',
    header: t('replenishment.columns.product', 'Product'),
    cell: ({ row }) => {
      const variant = row.original.product_variants
      if (!variant) return '—'
      return (
        <span className='font-medium'>
          {variant.products?.name
            ? `${variant.sku} — ${variant.products.name}`
            : variant.sku}
        </span>
      )
    },
  },
  {
    id: 'store',
    header: t('replenishment.columns.store', 'Store'),
    cell: ({ row }) => row.original.stores?.name ?? '—',
  },
  {
    accessorKey: 'qty_available_at_run',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('replenishment.columns.available', 'Available')}
      />
    ),
    cell: ({ row }) => row.original.qty_available_at_run,
  },
  {
    accessorKey: 'qty_on_order_at_run',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('replenishment.columns.onOrder', 'On order')}
      />
    ),
    cell: ({ row }) => row.original.qty_on_order_at_run,
  },
  {
    accessorKey: 'suggested_qty',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('replenishment.columns.suggested', 'Suggested')}
      />
    ),
    cell: ({ row }) => (
      <span className='font-semibold'>{row.original.suggested_qty}</span>
    ),
  },
  {
    id: 'supplier',
    header: t('replenishment.columns.supplier', 'Supplier'),
    cell: ({ row }) => row.original.suppliers?.name ?? '—',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('replenishment.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status]}
        className='capitalize'
      >
        {t(`replenishment.status.${row.original.status}`, row.original.status)}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'run_at',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('replenishment.columns.runAt', 'Run at')}
      />
    ),
    cell: ({ row }) =>
      new Date(row.original.run_at).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) => <SuggestionRowActions row={row.original} />,
  },
]

export const columns: ColumnDef<SuggestionListItem>[] = getColumns()
