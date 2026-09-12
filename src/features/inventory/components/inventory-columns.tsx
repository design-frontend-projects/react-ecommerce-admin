import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Inventory } from '../data/schema'
import { InventoryRowActions } from './inventory-row-actions'

export interface InventoryColumnActions {
  onOpenDetail?: (item: Inventory) => void
}

export function getInventoryStatus(
  item: Inventory
): 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' {
  const quantity = Number(item.qty_on_hand ?? item.quantity ?? 0)
  const minStock =
    item.reorder_point ??
    item.min_quantity ??
    item.reorder_level ??
    0
  const maxStock = item.max_quantity ?? item.max_stock_level

  if (quantity === 0) return 'out_of_stock'
  if (quantity <= minStock) return 'low_stock'
  if (maxStock != null && quantity > maxStock) return 'overstocked'
  return 'in_stock'
}

export const getColumns = (
  t: TFunction = i18n.t,
  actions?: InventoryColumnActions
): ColumnDef<Inventory>[] => [
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
    accessorFn: (row) =>
      [
        row.products?.name,
        row.products?.sku,
        row.product_variants?.name,
        row.product_variants?.sku,
      ]
        .filter(Boolean)
        .join(' '),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.product', 'Product')}
      />
    ),
    cell: ({ row }) => {
      const product = row.original.products
      return (
        <div
          className='flex flex-col cursor-pointer group'
          onClick={() => actions?.onOpenDetail?.(row.original)}
        >
          <span className='font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1'>
            {product?.name || t('inventory.unknownProduct', 'Unknown Product')}
          </span>
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
    accessorFn: (row) => row.product_variants?.sku || row.product_variants?.name || '',
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
          <span className='font-medium text-sm text-foreground line-clamp-1'>
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
    id: 'warehouse',
    accessorFn: (row) => row.warehouses?.name || row.warehouses?.code || '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.warehouse', 'Warehouse')}
      />
    ),
    cell: ({ row }) => {
      const warehouse = row.original.warehouses
      if (!warehouse) {
        return (
          <span className='text-xs text-muted-foreground italic'>
            {t('common.unassigned', 'Unassigned')}
          </span>
        )
      }

      return (
        <div className='flex items-center gap-1.5'>
          <Badge variant='outline' className='font-mono text-xs px-1.5 py-0'>
            {warehouse.code}
          </Badge>
          <span className='text-xs font-medium text-foreground line-clamp-1'>
            {warehouse.name}
          </span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      if (!value) return true
      if (Array.isArray(value)) {
        return value.length === 0 || value.includes(row.getValue(id))
      }
      return row.getValue(id) === value
    },
  },
  {
    id: 'location',
    accessorFn: (row) => row.warehouse_locations?.code,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.location', 'Location / Bin')}
      />
    ),
    cell: ({ row }) => {
      const location = row.original.warehouse_locations
      if (!location) {
        return (
          <span className='text-xs text-muted-foreground'>
            {t('inventory.columns.generalArea', 'General')}
          </span>
        )
      }

      return (
        <div className='flex flex-col'>
          <div className='flex items-center gap-1.5'>
            <Badge variant='secondary' className='text-xs font-mono px-1.5 py-0'>
              {location.code}
            </Badge>
            {location.location_type && (
              <span className='text-[10px] text-muted-foreground uppercase'>
                {location.location_type}
              </span>
            )}
          </div>
          {location.path && (
            <span className='text-[10px] text-muted-foreground font-mono truncate max-w-28'>
              {location.path}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'on_hand',
    accessorKey: 'qty_on_hand',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.onHand', 'On-Hand Stock')}
      />
    ),
    cell: ({ row }) => {
      const qty = Number(row.original.qty_on_hand ?? row.original.quantity ?? 0)
      return (
        <div className='flex flex-col'>
          <span className='font-bold text-base text-foreground'>
            {qty.toLocaleString()}
          </span>
          <span className='text-[10px] text-muted-foreground uppercase'>
            {row.original.condition || 'good'}
          </span>
        </div>
      )
    },
  },
  {
    id: 'available_reserved',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.availableReserved', 'Avail / Rsvd')}
      />
    ),
    cell: ({ row }) => {
      const avail = Number(row.original.qty_available ?? row.original.qty_on_hand ?? 0)
      const rsvd = Number(row.original.qty_reserved ?? 0)

      return (
        <div className='text-xs space-y-0.5'>
          <div className='text-emerald-600 dark:text-emerald-400 font-medium'>
            {t('inventory.detail.available', 'Avail')}: {avail.toLocaleString()}
          </div>
          {rsvd > 0 && (
            <div className='text-amber-600 dark:text-amber-400 font-medium'>
              {t('inventory.detail.reserved', 'Rsvd')}: {rsvd.toLocaleString()}
            </div>
          )}
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
      const min =
        row.original.reorder_point ??
        row.original.min_quantity ??
        row.original.reorder_level ??
        0
      const max = row.original.max_quantity ?? row.original.max_stock_level

      return (
        <div className='text-xs text-muted-foreground'>
          <div>
            {t('inventory.columns.min', 'Min')}:{' '}
            <strong className='text-foreground'>{min}</strong>
          </div>
          {max != null && (
            <div>
              {t('inventory.columns.max', 'Max')}:{' '}
              <strong className='text-foreground'>{max}</strong>
            </div>
          )}
        </div>
      )
    },
  },
  {
    id: 'valuation',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.valuation', 'Valuation')}
      />
    ),
    cell: ({ row }) => {
      const qty = Number(row.original.qty_on_hand ?? row.original.quantity ?? 0)
      const avgCost = Number(row.original.avg_cost ?? 0)
      const totalVal = qty * avgCost

      return (
        <div className='text-xs'>
          <div className='font-mono font-semibold text-foreground'>
            ${totalVal.toFixed(2)}
          </div>
          {avgCost > 0 && (
            <div className='text-muted-foreground text-[10px] font-mono'>
              @${avgCost.toFixed(2)}/u
            </div>
          )}
        </div>
      )
    },
  },
  {
    id: 'status',
    accessorFn: (row) => getInventoryStatus(row),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.status', 'Status')}
      />
    ),
    cell: ({ row }) => {
      const statusCode = getInventoryStatus(row.original)
      let statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'default'
      let text = t('inventory.status.inStock', 'In Stock')

      if (statusCode === 'out_of_stock') {
        statusVariant = 'destructive'
        text = t('inventory.status.outOfStock', 'Out of Stock')
      } else if (statusCode === 'low_stock') {
        statusVariant = 'secondary'
        text = t('inventory.status.lowStock', 'Low Stock')
      } else if (statusCode === 'overstocked') {
        statusVariant = 'outline'
        text = t('inventory.status.overstocked', 'Overstocked')
      }

      return <Badge variant={statusVariant}>{text}</Badge>
    },
    filterFn: (row, id, value) => {
      if (!value) return true
      if (Array.isArray(value)) {
        return value.length === 0 || value.includes(row.getValue(id))
      }
      return row.getValue(id) === value
    },
  },
  {
    accessorKey: 'last_count_date',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.lastRestock', 'Last Count')}
      />
    ),
    cell: ({ row }) => {
      const dateStr =
        row.original.last_count_date ||
        row.original.last_restocked ||
        row.original.updated_at
      if (!dateStr) {
        return (
          <div className='text-muted-foreground text-xs'>
            {t('common.never', 'Never')}
          </div>
        )
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
    cell: ({ row }) => <InventoryRowActions row={row} onOpenDetail={actions?.onOpenDetail} />,
  },
]
