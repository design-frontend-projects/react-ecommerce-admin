import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { type Product } from '../data/schema'
import { ProductRowActions } from './product-row-actions'

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
      <DataTableColumnHeader column={column} title={t('products.columns.name')} />
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
      <DataTableColumnHeader column={column} title={t('products.columns.sku')} />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs font-medium'>{row.getValue('sku')}</div>
    ),
  },
  {
    id: 'category',
    accessorFn: (row) => row.categories?.name || '',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.category')} />
    ),
    cell: ({ row }) => {
      const categoryName = row.original.categories?.name
      return (
        <div className='text-sm text-muted-foreground'>
          {categoryName || '—'}
        </div>
      )
    },
  },
  {
    id: 'brand',
    accessorFn: (row) => row.brands?.name || '',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.brand')} />
    ),
    cell: ({ row }) => {
      const brandName = row.original.brands?.name
      return (
        <div className='text-sm text-muted-foreground'>
          {brandName || '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'product_type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.productType')} />
    ),
    cell: ({ row }) => {
      const pType = (row.getValue('product_type') as string) || 'simple'
      const key = `products.enums.productType.${pType}`
      const macroType = row.original.product_types
      return (
        <div className='flex flex-col gap-1 items-start'>
          <Badge variant='outline' className='text-xs font-normal capitalize'>
            {t(key, pType)}
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
  },
  {
    id: 'price',
    accessorFn: (row) => {
      const variants = row.product_variants || []
      for (const v of variants) {
        const pli = (v as { price_list_items?: Array<{ price: number | string }> }).price_list_items
        if (pli && pli.length > 0) return Number(pli[0].price)
        if (v.price != null) return Number(v.price)
      }
      if (row.base_price !== null && row.base_price !== undefined) {
        return Number(row.base_price)
      }
      return 0
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.price')} />
    ),
    cell: ({ row }) => {
      const variants = row.original.product_variants || []
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      })

      const prices = variants
        .map((v) => {
          const pli = (v as { price_list_items?: Array<{ price: number | string }> }).price_list_items
          if (pli && pli.length > 0) return Number(pli[0].price)
          return v.price != null ? Number(v.price) : 0
        })
        .filter((p) => p > 0)

      if (prices.length > 1) {
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)

        if (minPrice === maxPrice) {
          return <div className='font-medium text-sm'>{formatter.format(minPrice)}</div>
        }

        return (
          <div className='font-medium text-sm'>
            {formatter.format(minPrice)} - {formatter.format(maxPrice)}
          </div>
        )
      }

      const singlePrice = prices.length === 1 ? prices[0] : Number(row.original.base_price || 0)
      return <div className='font-medium text-sm'>{formatter.format(singlePrice)}</div>
    },
  },
  {
    id: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.stock', { defaultValue: 'Stock' })} />
    ),
    cell: ({ row }) => {
      const variants = row.original.product_variants || []
      let totalAvailable = 0
      let hasBalance = false

      for (const v of variants) {
        const balances = (v as { stock_balances?: Array<{ qty_available?: number | string; qty_on_hand?: number | string; qty_reserved?: number | string }> }).stock_balances
        if (balances && balances.length > 0) {
          hasBalance = true
          for (const b of balances) {
            totalAvailable += Number(b.qty_available ?? (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0)))
          }
        } else if (!hasBalance) {
          totalAvailable += Number(v.stock_quantity || 0)
        }
      }

      return (
        <Badge
          variant={totalAvailable > 0 ? 'outline' : 'secondary'}
          className={`text-xs ${totalAvailable > 0 ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' : 'text-muted-foreground'}`}
        >
          {totalAvailable > 0 ? `${totalAvailable} in stock` : 'Out of stock'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.status')} />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue('is_active')
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ProductRowActions,
  },
]
