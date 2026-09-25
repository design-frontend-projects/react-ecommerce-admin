import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { type Product } from '../data/schema'
import { ProductRowActions } from './product-row-actions'

export function computeTotalStock(product: Product): number {
  const variants = product.product_variants || []
  let totalAvailable = 0

  for (const v of variants) {
    const balances = (v as {
      stock_balances?: Array<{
        qty_available?: number | string
        qty_on_hand?: number | string
        qty_reserved?: number | string
      }>
    }).stock_balances
    if (balances && balances.length > 0) {
      for (const b of balances) {
        totalAvailable += Number(
          b.qty_available ??
            (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))
        )
      }
    }
  }

  return totalAvailable
}

export function getStockStatus(
  product: Product
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  const stock = computeTotalStock(product)
  if (stock <= 0) return 'out_of_stock'
  if (stock <= 5) return 'low_stock'
  return 'in_stock'
}

export const getColumns = (t: TFunction): ColumnDef<Product>[] => [
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
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.name', { defaultValue: 'Product Name' })}
      />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col gap-0.5'>
        <LongText className='max-w-48 font-medium'>
          {row.getValue('name')}
        </LongText>
        {row.original.barcode && (
          <span className='text-xs text-muted-foreground font-mono'>
            {row.original.barcode}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'sku',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.sku', { defaultValue: 'SKU' })}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs font-medium'>{row.getValue('sku')}</div>
    ),
  },
  {
    id: 'category',
    accessorFn: (row) => row.categories?.name || '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.category', { defaultValue: 'Category' })}
      />
    ),
    cell: ({ row }) => {
      const categoryName = row.original.categories?.name
      return (
        <div className='text-sm text-muted-foreground'>
          {categoryName || '—'}
        </div>
      )
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'brand',
    accessorFn: (row) => row.brands?.name || '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.brand', { defaultValue: 'Brand' })}
      />
    ),
    cell: ({ row }) => {
      const brandName = row.original.brands?.name
      return (
        <div className='text-sm text-muted-foreground'>
          {brandName || '—'}
        </div>
      )
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'supplier',
    accessorFn: (row) => row.suppliers?.name || '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.supplier', { defaultValue: 'Supplier' })}
      />
    ),
    cell: ({ row }) => {
      const supplierName = row.original.suppliers?.name
      const supplierCode = row.original.suppliers?.code
      if (!supplierName) return <span className='text-xs text-muted-foreground'>—</span>
      return (
        <div className='flex flex-col text-xs'>
          <span className='font-medium text-foreground truncate max-w-[130px]'>
            {supplierName}
          </span>
          {supplierCode && (
            <span className='text-[10px] text-muted-foreground font-mono'>
              {supplierCode}
            </span>
          )}
        </div>
      )
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
    enableHiding: true,
  },
  {
    id: 'base_uom',
    accessorFn: (row) => row.base_uom?.name || row.base_uom?.code || '',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.uom', { defaultValue: 'Base UOM' })}
      />
    ),
    cell: ({ row }) => {
      const uom = row.original.base_uom
      if (!uom) return <span className='text-xs text-muted-foreground'>—</span>
      return (
        <Badge variant='outline' className='text-[11px] font-normal font-mono'>
          {uom.code || uom.name}
        </Badge>
      )
    },
    enableHiding: true,
  },
  {
    accessorKey: 'product_type',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.productType', { defaultValue: 'Type' })}
      />
    ),
    cell: ({ row }) => {
      const pType = (row.getValue('product_type') as string) || 'simple'
      const key = `products.enums.productType.${pType}`
      const macroType = row.original.product_types
      return (
        <div className='flex flex-col gap-1 items-start'>
          <Badge variant='outline' className='text-xs font-normal capitalize'>
            {t(key, { defaultValue: pType })}
          </Badge>
          {macroType && (
            <span
              className='text-[10px] text-muted-foreground flex items-center gap-1'
              title={macroType.name}
            >
              {macroType.color && (
                <span
                  className='h-1.5 w-1.5 rounded-full shrink-0'
                  style={{ backgroundColor: macroType.color }}
                />
              )}
              <span className='truncate max-w-[120px]'>{macroType.name}</span>
            </span>
          )}
        </div>
      )
    },
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'stock',
    accessorFn: (row) => computeTotalStock(row),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.stock', { defaultValue: 'Stock' })}
      />
    ),
    sortingFn: 'basic',
    cell: ({ row }) => {
      const totalAvailable = Number(row.getValue('stock') || 0)
      const isLowStock = totalAvailable > 0 && totalAvailable <= 5

      if (totalAvailable <= 0) {
        return (
          <div className='flex flex-col items-start gap-0.5'>
            <Badge
              variant='outline'
              className='text-xs gap-1 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium'
            >
              <XCircle className='h-3 w-3' />
              {t('products.stockStatus.outOfStock', { defaultValue: 'Out of stock' })}
            </Badge>
          </div>
        )
      }

      if (isLowStock) {
        return (
          <div className='flex flex-col items-start gap-0.5'>
            <Badge
              variant='outline'
              className='text-xs gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium'
            >
              <AlertTriangle className='h-3 w-3' />
              {totalAvailable} {t('products.stockStatus.lowStockSuffix', { defaultValue: 'left (Low)' })}
            </Badge>
          </div>
        )
      }

      return (
        <div className='flex flex-col items-start gap-0.5'>
          <Badge
            variant='outline'
            className='text-xs gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
          >
            <CheckCircle2 className='h-3 w-3' />
            {totalAvailable} {t('products.stockStatus.inStockSuffix', { defaultValue: 'in stock' })}
          </Badge>
        </div>
      )
    },
  },
  {
    id: 'stock_status',
    accessorFn: (row) => getStockStatus(row),
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id))
    },
    enableHiding: true,
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.status', { defaultValue: 'Status' })}
      />
    ),
    filterFn: (row, id, value: string[]) => {
      return value.includes(String(row.getValue(id)))
    },
    cell: ({ row }) => {
      const isActive = Boolean(row.getValue('is_active'))
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600'
              : 'text-muted-foreground'
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
              isActive ? 'bg-white' : 'bg-muted-foreground'
            }`}
          />
          {isActive
            ? t('common.active', { defaultValue: 'Active' })
            : t('common.inactive', { defaultValue: 'Inactive' })}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('products.columns.createdAt', { defaultValue: 'Created' })}
      />
    ),
    sortingFn: 'datetime',
    cell: ({ row }) => {
      const rawDate = row.getValue('created_at') as string | undefined
      if (!rawDate) return <span className='text-xs text-muted-foreground'>—</span>
      try {
        const d = new Date(rawDate)
        return (
          <span className='text-xs text-muted-foreground font-mono'>
            {d.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      } catch {
        return <span className='text-xs text-muted-foreground'>—</span>
      }
    },
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ProductRowActions,
    enableSorting: false,
    enableHiding: false,
  },
]
