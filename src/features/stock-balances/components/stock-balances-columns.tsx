import { type ColumnDef } from '@tanstack/react-table'
import { Warehouse, Store, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import type { StockBalanceRow } from '../data/schema'
import { StockBalancesRowActions } from './stock-balances-row-actions'

const CONDITION_STYLES: Record<string, { label: string; className: string }> = {
  good: { label: 'Good', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' },
  damaged: { label: 'Damaged', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300' },
  refurbished: { label: 'Refurbished', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' },
  returned: { label: 'Returned', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' },
}

export const columns: ColumnDef<StockBalanceRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'product_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product & SKU' />
    ),
    cell: ({ row }) => {
      const productName =
        row.original.product_variants?.products?.name || 'Unknown Product'
      const sku = row.original.product_variants?.sku || '—'
      const barcode = row.original.product_variants?.barcode

      return (
        <div className='flex flex-col gap-0.5'>
          <span className='font-medium text-foreground line-clamp-1'>{productName}</span>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span className='font-mono'>SKU: {sku}</span>
            {barcode && (
              <>
                <span>•</span>
                <span className='font-mono text-[11px]'>{barcode}</span>
              </>
            )}
          </div>
        </div>
      )
    },
    filterFn: (row, _id, filterValue: string) => {
      const name =
        row.original.product_variants?.products?.name?.toLowerCase() ?? ''
      const sku = row.original.product_variants?.sku?.toLowerCase() ?? ''
      const barcode = row.original.product_variants?.barcode?.toLowerCase() ?? ''
      const search = filterValue.toLowerCase()
      return name.includes(search) || sku.includes(search) || barcode.includes(search)
    },
  },
  {
    id: 'facility',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Facility & Location' />
    ),
    cell: ({ row }) => {
      const isWarehouse = Boolean(row.original.warehouse_id)
      const facilityName =
        row.original.warehouses?.name ??
        row.original.stores?.name ??
        '—'
      const facilityCode = row.original.warehouses?.code
      const binLocation = row.original.warehouse_locations?.code

      return (
        <div className='flex items-start gap-2'>
          {isWarehouse ? (
            <Warehouse className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
          ) : (
            <Store className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
          )}
          <div className='flex flex-col'>
            <span className='text-sm font-medium'>
              {facilityName} {facilityCode ? `(${facilityCode})` : ''}
            </span>
            {binLocation && (
              <span className='text-xs text-muted-foreground font-mono'>
                Bin: {binLocation}
              </span>
            )}
          </div>
        </div>
      )
    },
    filterFn: (row, _id, filterValue: string) => {
      const whName = row.original.warehouses?.name?.toLowerCase() ?? ''
      const storeName = row.original.stores?.name?.toLowerCase() ?? ''
      const binCode = row.original.warehouse_locations?.code?.toLowerCase() ?? ''
      const search = filterValue.toLowerCase()
      return whName.includes(search) || storeName.includes(search) || binCode.includes(search)
    },
  },
  {
    accessorKey: 'condition',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Condition' />
    ),
    cell: ({ row }) => {
      const condition = row.original.condition ?? 'good'
      const style = CONDITION_STYLES[condition] || CONDITION_STYLES.good

      return (
        <Badge variant='outline' className={`capitalize text-xs font-normal ${style.className}`}>
          {style.label}
        </Badge>
      )
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'qty_on_hand',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='On Hand' />
    ),
    cell: ({ row }) => {
      const qty = Number(row.getValue('qty_on_hand'))
      return (
        <div className='font-mono font-bold text-sm'>
          {qty.toLocaleString()}
        </div>
      )
    },
  },
  {
    accessorKey: 'qty_reserved',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Reserved' />
    ),
    cell: ({ row }) => {
      const qty = Number(row.getValue('qty_reserved'))
      return (
        <div className='font-mono text-sm text-muted-foreground'>
          {qty.toLocaleString()}
        </div>
      )
    },
  },
  {
    accessorKey: 'qty_available',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Available' />
    ),
    cell: ({ row }) => {
      const qty = Number(row.getValue('qty_available') ?? 0)
      const colorClass =
        qty <= 0
          ? 'text-destructive'
          : qty <= 10
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400'

      return (
        <div className={`font-mono font-bold text-sm ${colorClass}`}>
          {qty.toLocaleString()}
        </div>
      )
    },
  },
  {
    accessorKey: 'avg_cost',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Avg Cost' />
    ),
    cell: ({ row }) => {
      const cost = Number(row.getValue('avg_cost'))
      return (
        <div className='font-mono text-xs'>
          {cost > 0 ? `$${cost.toFixed(2)}` : '—'}
        </div>
      )
    },
  },
  {
    id: 'valuation',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total Value' />
    ),
    cell: ({ row }) => {
      const onHand = Number(row.original.qty_on_hand || 0)
      const avgCost = Number(row.original.avg_cost || 0)
      const val = onHand * avgCost

      return (
        <div className='font-mono text-xs font-semibold'>
          {val > 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </div>
      )
    },
  },
  {
    id: 'status',
    accessorFn: (row) => {
      const onHand = Number(row.qty_on_hand || 0)
      const reorderLevel = Number(row.product_variants?.products?.reorder_level ?? 10)
      if (onHand <= 0) return 'out_of_stock'
      if (onHand <= reorderLevel) return 'low_stock'
      return 'in_stock'
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const onHand = Number(row.original.qty_on_hand || 0)
      const reorderLevel = Number(row.original.product_variants?.products?.reorder_level ?? 10)

      if (onHand <= 0) {
        return (
          <Badge variant='destructive' className='flex items-center gap-1 w-fit text-[11px]'>
            <XCircle className='h-3 w-3' />
            Out of Stock
          </Badge>
        )
      }

      if (onHand <= reorderLevel) {
        return (
          <Badge variant='secondary' className='flex items-center gap-1 w-fit text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'>
            <AlertTriangle className='h-3 w-3' />
            Low Stock
          </Badge>
        )
      }

      return (
        <Badge variant='outline' className='flex items-center gap-1 w-fit text-[11px] text-emerald-600 border-emerald-300 dark:border-emerald-800 dark:text-emerald-400'>
          <CheckCircle2 className='h-3 w-3' />
          In Stock
        </Badge>
      )
    },
    filterFn: (row, _id, value: string[]) => {
      const onHand = Number(row.original.qty_on_hand || 0)
      const reorderLevel = Number(row.original.product_variants?.products?.reorder_level ?? 10)
      let status = 'in_stock'
      if (onHand <= 0) status = 'out_of_stock'
      else if (onHand <= reorderLevel) status = 'low_stock'
      return value.includes(status)
    },
  },
  {
    accessorKey: 'last_movement_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Last Movement' />
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue('last_movement_at') as string | null
      if (!dateStr) return <div className='text-xs text-muted-foreground'>Never</div>

      const date = new Date(dateStr)
      return (
        <div className='flex flex-col text-xs'>
          <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className='text-[10px] text-muted-foreground'>
            {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: StockBalancesRowActions,
  },
]
