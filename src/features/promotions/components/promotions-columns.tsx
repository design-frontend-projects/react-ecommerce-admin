import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { type Promotion } from '../hooks/use-promotions'
import { PromotionRowActions } from './promotion-row-actions'

export const columns: ColumnDef<Promotion>[] = [
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
    header: 'Name',
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => <Badge variant='outline'>{row.getValue('code')}</Badge>,
  },
  {
    accessorKey: 'promo_type',
    header: 'Type',
    cell: ({ row }) => {
      const promoType = row.original.promo_type
      if (promoType === 'buy_x_get_y') {
        return (
          <Badge variant='secondary'>
            Buy {row.original.buy_quantity ?? '?'} Get{' '}
            {row.original.get_quantity ?? '?'}
          </Badge>
        )
      }
      return (
        <Badge variant='secondary'>
          {promoType === 'item_discount' ? 'Item Discount' : 'Order Discount'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'activities',
    header: 'Activities',
    cell: ({ row }) => {
      const activities = row.original.activities ?? []
      const labels: Record<string, string> = {
        dine_in: 'Dine-in',
        takeaway: 'Takeaway',
        delivery: 'Delivery',
      }
      if (activities.length === 3) {
        return <span className='text-muted-foreground'>All</span>
      }
      return (
        <div className='flex flex-wrap gap-1'>
          {activities.map((activity) => (
            <Badge key={activity} variant='outline' className='text-xs'>
              {labels[activity] ?? activity}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'discount_value',
    header: 'Discount',
    cell: ({ row }) => {
      if (row.original.promo_type === 'buy_x_get_y') {
        const pct = row.original.get_discount_value ?? 100
        return pct >= 100 ? 'Free items' : `${pct}% off items`
      }
      const type = row.original.discount_type
      const value = row.getValue('discount_value') as number
      return type === 'percentage' ? `${value}%` : `$${value.toFixed(2)}`
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
        {row.getValue('is_active') ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    accessorKey: 'end_date',
    header: 'Expires',
    cell: ({ row }) => {
      const date = row.getValue('end_date') as string
      return date ? new Date(date).toLocaleDateString() : 'Never'
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <PromotionRowActions row={row} />,
  },
]
