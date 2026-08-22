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
      <LongText className='max-w-48 font-medium'>
        {row.getValue('name')}
      </LongText>
    ),
  },
  {
    accessorKey: 'sku',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.sku')} />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs'>{row.getValue('sku')}</div>
    ),
  },
  {
    id: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.category')} />
    ),
    cell: ({ row }) => {
      const product = row.original
      return (
        <div className='text-sm text-muted-foreground'>
          {product.categories?.name || 'N/A'}
        </div>
      )
    },
  },
  {
    id: 'price',
    accessorFn: (row) => {
      if (!row.product_variants || row.product_variants.length === 0) return 0
      return row.product_variants[0].price
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('products.columns.price')} />
    ),
    cell: ({ row }) => {
      const variants = row.original.product_variants
      if (!variants || variants.length === 0) {
        return <div className='font-medium text-muted-foreground'>N/A</div>
      }

      const prices = variants.map((v) => Number(v.price))
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)

      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      })

      if (minPrice === maxPrice) {
        return <div className='font-medium'>{formatter.format(minPrice)}</div>
      }

      return (
        <div className='font-medium'>
          {formatter.format(minPrice)} - {formatter.format(maxPrice)}
        </div>
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

export const columns = getColumns((k: string) => k)

