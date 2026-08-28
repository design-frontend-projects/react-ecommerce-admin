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
      if (row.base_price !== null && row.base_price !== undefined) {
        return Number(row.base_price)
      }
      if (!row.product_variants || row.product_variants.length === 0) return 0
      return Number(row.product_variants[0].price)
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.price')} />
    ),
    cell: ({ row }) => {
      const variants = row.original.product_variants
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      })

      if (variants && variants.length > 1) {
        const prices = variants.map((v) => Number(v.price))
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

      const price =
        row.original.base_price !== null && row.original.base_price !== undefined
          ? Number(row.original.base_price)
          : variants && variants.length === 1
            ? Number(variants[0].price)
            : 0

      return <div className='font-medium text-sm'>{formatter.format(price)}</div>
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
