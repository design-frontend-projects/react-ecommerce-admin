import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import i18n from '@/config/i18n'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { type Promotion } from '../hooks/use-promotions'
import { PromotionRowActions } from './promotion-row-actions'

export const getPromotionColumns = (
  t: TFunction = i18n.t
): ColumnDef<Promotion>[] => [
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
    accessorKey: 'name',
    header: t('common.name', 'Name'),
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'code',
    header: t('common.code', 'Code'),
    cell: ({ row }) => <Badge variant='outline'>{row.getValue('code')}</Badge>,
  },
  {
    accessorKey: 'promo_type',
    header: t('promotions.common.type', 'Type'),
    cell: ({ row }) => {
      const promoType = row.original.promo_type
      if (promoType === 'buy_x_get_y') {
        return (
          <Badge variant='secondary'>
            {t('promotions.wizard.step2.buyQty', 'Buy')} {row.original.buy_quantity ?? '?'} {t('promotions.wizard.step2.getQty', 'Get')}{' '}
            {row.original.get_quantity ?? '?'}
          </Badge>
        )
      }
      return (
        <Badge variant='secondary'>
          {promoType === 'item_discount'
            ? t('promotions.common.percentage', 'Item Discount')
            : t('promotions.common.orderDiscount', 'Order Discount')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'activities',
    header: t('promotions.detailPage.locationsChannels', 'Activities'),
    cell: ({ row }) => {
      const activities = row.original.activities ?? []
      const labels: Record<string, string> = {
        dine_in: t('restaurant.dineIn', 'Dine-in'),
        takeaway: t('restaurant.takeaway', 'Takeaway'),
        delivery: t('restaurant.delivery', 'Delivery'),
      }
      if (activities.length === 3) {
        return <span className='text-muted-foreground'>{t('promotions.common.all', 'All')}</span>
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
    header: t('promotions.wizard.step2.discountValue', 'Discount'),
    cell: ({ row }) => {
      if (row.original.promo_type === 'buy_x_get_y') {
        const pct = row.original.get_discount_value ?? 100
        return pct >= 100
          ? t('promotions.common.freeItems', 'Free items')
          : `${pct}${t('promotions.common.offItems', '% off items')}`
      }
      const type = row.original.discount_type
      const value = row.getValue('discount_value') as number
      return type === 'percentage' ? `${value}%` : `$${value.toFixed(2)}`
    },
  },
  {
    accessorKey: 'is_active',
    header: t('promotions.common.status', 'Status'),
    cell: ({ row }) => (
      <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
        {row.getValue('is_active')
          ? t('promotions.common.active', 'Active')
          : t('promotions.common.inactive', 'Inactive')}
      </Badge>
    ),
  },
  {
    accessorKey: 'end_date',
    header: t('promotions.wizard.step1.endDate', 'Expires'),
    cell: ({ row }) => {
      const date = row.getValue('end_date') as string
      return date ? new Date(date).toLocaleDateString() : t('promotions.common.never', 'Never')
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <PromotionRowActions row={row} />,
  },
]

export const columns: ColumnDef<Promotion>[] = getPromotionColumns()

