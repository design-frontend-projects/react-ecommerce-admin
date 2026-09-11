import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { type Inventory } from '../data/schema'
import { InventoryRowActions } from './inventory-row-actions'

export const getColumns = (t: TFunction): ColumnDef<Inventory>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t('common.selectAll', 'Select all')}
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t('common.selectRow', 'Select row')}
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'product_name',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.product', 'Product')}
      />
    ),
    cell: ({ row }) => {
      const product = row.original.products
      return (
        <div className='flex flex-col'>
          <LongText className='max-w-48 font-medium'>
            {product?.name || t('inventory.unknownProduct', 'Unknown Product')}
          </LongText>
          {product?.sku && (
            <span className='text-xs text-muted-foreground font-mono'>
              SKU: {product.sku}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'variant',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.variant', 'Variant / SKU')}
      />
    ),
    cell: ({ row }) => {
      const variant = row.original.product_variants
      if (!variant) {
        return (
          <Badge variant='outline' className='text-xs font-normal text-muted-foreground'>
            {t('inventory.standardProduct', 'Standard Product')}
          </Badge>
        )
      }

      return (
        <div className='flex flex-col gap-0.5'>
          <span className='font-medium text-sm'>
            {variant.name || t('common.default', 'Default')}
          </span>
          <span className='text-xs font-mono text-muted-foreground'>
            [{variant.sku}]
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.onHand', 'On-Hand Stock')}
      />
    ),
    cell: ({ row }) => {
      const quantity = Number(row.original.quantity ?? 0)
      return (
        <div className='font-semibold text-sm'>
          {quantity.toLocaleString()}
        </div>
      )
    },
  },
  {
    id: 'thresholds',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.reorderMax', 'Reorder / Max')}
      />
    ),
    cell: ({ row }) => {
      const min = row.original.reorder_point ?? row.original.min_quantity ?? row.original.reorder_level ?? 0
      const max = row.original.max_quantity ?? row.original.max_stock_level
      return (
        <div className='text-xs text-muted-foreground'>
          <span>
            {t('inventory.columns.min', 'Min')}:{' '}
            <strong className='text-foreground'>{min}</strong>
          </span>
          {max != null && (
            <span className='ms-2'>
              {t('inventory.columns.max', 'Max')}:{' '}
              <strong className='text-foreground'>{max}</strong>
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => {
      const quantity = Number(row.original.quantity ?? 0)
      const minStock = row.original.reorder_point ?? row.original.min_quantity ?? row.original.reorder_level ?? 0
      const maxStock = row.original.max_quantity ?? row.original.max_stock_level

      let status: 'default' | 'destructive' | 'secondary' | 'outline' = 'default'
      let text = t('inventory.status.inStock', 'In Stock')

      if (quantity === 0) {
        status = 'destructive'
        text = t('inventory.status.outOfStock', 'Out of Stock')
      } else if (quantity <= minStock) {
        status = 'secondary'
        text = t('inventory.status.lowStock', 'Low Stock')
      } else if (maxStock != null && quantity > maxStock) {
        status = 'outline'
        text = t('inventory.status.overstocked', 'Overstocked')
      }

      return <Badge variant={status}>{text}</Badge>
    },
  },
  {
    accessorKey: 'last_count_date',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.lastRestock', 'Last Count / Restock')}
      />
    ),
    cell: ({ row }) => {
      const dateStr = row.original.last_count_date || row.original.last_restocked || row.original.updated_at
      if (!dateStr) {
        return <div className='text-muted-foreground text-xs'>{t('common.never', 'Never')}</div>
      }
      return (
        <div className='text-xs text-muted-foreground'>
          {new Date(dateStr).toLocaleDateString()}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: InventoryRowActions,
  },
]

export const columns = getColumns((k: string) => k)
