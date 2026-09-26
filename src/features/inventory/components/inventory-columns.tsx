import { type ColumnDef } from '@tanstack/react-table'
import i18n from '@/config/i18n'
import { type TFunction } from 'i18next'
import { Barcode, Boxes, ShoppingCart, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
    item.reorder_point ?? item.min_quantity ?? item.reorder_level ?? 0
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
        row.sku,
      ]
        .filter(Boolean)
        .join(' '),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.product', 'Product & Variant')}
      />
    ),
    cell: ({ row }) => {
      const product = row.original.products
      const variant = row.original.product_variants
      return (
        <div
          className='group flex max-w-[220px] cursor-pointer flex-col'
          onClick={() => actions?.onOpenDetail?.(row.original)}
        >
          <span className='line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary'>
            {product?.name || t('inventory.unknownProduct', 'Unknown Product')}
          </span>
          <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
            {variant?.name && (
              <span className='line-clamp-1 font-medium text-foreground/80'>
                {variant.name}
              </span>
            )}
            {variant?.sku && (
              <span className='font-mono text-[11px] text-muted-foreground'>
                [{variant.sku}]
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    id: 'item_sku',
    accessorFn: (row) => row.sku || row.barcode || '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.itemSku', 'Item SKU & Barcode')}
      />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex flex-col gap-1'>
          <Badge
            variant='outline'
            className='w-fit px-1.5 py-0 font-mono text-xs'
          >
            {row.original.sku}
          </Badge>
          {row.original.barcode && (
            <span className='flex items-center gap-1 font-mono text-[10px] text-muted-foreground'>
              <Barcode className='h-3 w-3' />
              {row.original.barcode}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'tracking_type',
    accessorKey: 'tracking_type',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.tracking', 'Tracking')}
      />
    ),
    cell: ({ row }) => {
      const tracking = row.original.tracking_type || 'NONE'
      let label = 'Standard'
      let variant: 'outline' | 'secondary' | 'default' = 'outline'

      if (tracking === 'LOT') {
        label = 'Lot / Batch'
        variant = 'secondary'
      } else if (tracking === 'SERIAL') {
        label = 'Serial #'
        variant = 'secondary'
      } else if (tracking === 'LOT_AND_SERIAL') {
        label = 'Lot & Serial'
        variant = 'default'
      }

      return (
        <Badge variant={variant} className='text-[10px] font-medium'>
          {label}
        </Badge>
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
    id: 'policies',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('inventory.columns.policies', 'Policies')}
      />
    ),
    cell: ({ row }) => {
      const item = row.original
      return (
        <TooltipProvider>
          <div className='flex items-center gap-1.5'>
            {item.is_stockable !== false && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary'>
                    <Boxes className='h-3 w-3' />
                  </span>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='text-xs'>
                  Stock Tracked
                </TooltipContent>
              </Tooltip>
            )}

            {item.is_sellable !== false && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                    <ShoppingCart className='h-3 w-3' />
                  </span>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='text-xs'>
                  Sellable on POS & Checkout
                </TooltipContent>
              </Tooltip>
            )}

            {item.is_purchasable !== false && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                    <Truck className='h-3 w-3' />
                  </span>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='text-xs'>
                  Purchasable on POs
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
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
          <Badge variant='outline' className='px-1.5 py-0 font-mono text-xs'>
            {warehouse.code}
          </Badge>
          <span className='line-clamp-1 text-xs font-medium text-foreground'>
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

      const aisle = location?.aisle || row.original.aisle
      const rack = location?.rack || row.original.rack
      const shelf = location?.shelf || row.original.shelf
      const bin = location?.bin || row.original.bin

      const coords = [
        aisle ? `Aisle ${aisle}` : null,
        rack ? `R:${rack}` : null,
        shelf ? `S:${shelf}` : null,
        bin ? `B:${bin}` : null,
      ]
        .filter(Boolean)
        .join(' ')

      return (
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-center gap-1.5'>
            <Badge
              variant='secondary'
              className='px-1.5 py-0 font-mono text-xs'
            >
              {location.code}
            </Badge>
            {location.location_type && (
              <span className='text-[10px] text-muted-foreground uppercase'>
                {location.location_type}
              </span>
            )}
          </div>
          {coords ? (
            <span className='max-w-32 truncate font-mono text-[10px] text-muted-foreground'>
              {coords}
            </span>
          ) : location.path ? (
            <span className='max-w-28 truncate font-mono text-[10px] text-muted-foreground'>
              {location.path}
            </span>
          ) : null}
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
      const uomCode = row.original.uoms?.code
      return (
        <div className='flex flex-col'>
          <span className='text-base font-bold text-foreground'>
            {qty.toLocaleString()}{' '}
            {uomCode && (
              <span className='text-xs font-normal text-muted-foreground'>
                {uomCode}
              </span>
            )}
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
      const avail = Number(
        row.original.qty_available ?? row.original.qty_on_hand ?? 0
      )
      const rsvd = Number(row.original.qty_reserved ?? 0)

      return (
        <div className='space-y-0.5 text-xs'>
          <div className='font-medium text-emerald-600 dark:text-emerald-400'>
            {t('inventory.detail.available', 'Avail')}: {avail.toLocaleString()}
          </div>
          {rsvd > 0 && (
            <div className='font-medium text-amber-600 dark:text-amber-400'>
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
      const safety = row.original.safety_stock

      return (
        <div className='space-y-0.5 text-xs text-muted-foreground'>
          <div>
            {t('inventory.columns.min', 'Min')}:{' '}
            <strong className='text-foreground'>{min}</strong>
          </div>
          {safety != null && safety > 0 && (
            <div className='text-[11px] text-amber-600 dark:text-amber-400'>
              Safety: <strong>{safety}</strong>
            </div>
          )}
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
      const avgCost = Number(
        row.original.avg_cost ?? row.original.unit_cost ?? 0
      )
      const totalVal = qty * avgCost

      return (
        <div className='text-xs'>
          <div className='font-mono font-semibold text-foreground'>
            ${totalVal.toFixed(2)}
          </div>
          {avgCost > 0 && (
            <div className='font-mono text-[10px] text-muted-foreground'>
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
      if (row.original.is_active === false) {
        return (
          <Badge
            variant='outline'
            className='border-dashed text-muted-foreground'
          >
            Inactive
          </Badge>
        )
      }

      const statusCode = getInventoryStatus(row.original)
      let statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' =
        'default'
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

      return (
        <div className='flex flex-col items-start gap-1'>
          <Badge variant={statusVariant}>{text}</Badge>
          {row.original.status && row.original.status !== 'ACTIVE' && (
            <span className='font-mono text-[10px] text-muted-foreground'>
              {row.original.status}
            </span>
          )}
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
          <div className='text-xs text-muted-foreground'>
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
    cell: ({ row }) => (
      <InventoryRowActions row={row} onOpenDetail={actions?.onOpenDetail} />
    ),
  },
]
