import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import { Users, Tag, Calendar, DollarSign } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { type CustomerGroup } from '../hooks/use-customer-groups'
import { CustomerGroupRowActions } from './customer-groups-row-actions'

export const getColumns = (t: TFunction): ColumnDef<CustomerGroup>[] => [
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
    header: t('customerGroups.columns.name', 'Group Name'),
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const description = row.original.description

      return (
        <div className='flex items-center gap-2.5 py-1'>
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs'>
            <Users className='h-4 w-4' />
          </div>
          <div className='flex flex-col min-w-0'>
            <span className='font-semibold text-foreground truncate'>{name}</span>
            {description ? (
              <span className='text-xs text-muted-foreground line-clamp-1' title={description}>
                {description}
              </span>
            ) : (
              <span className='text-xs text-muted-foreground/60 italic'>
                {t('common.noDescription', 'No description')}
              </span>
            )}
          </div>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'discount_percentage',
    header: t('customerGroups.columns.discount', 'Discount'),
    cell: ({ row }) => {
      const discount = Number(row.getValue('discount_percentage')) || 0
      if (discount <= 0) {
        return (
          <Badge variant='outline' className='text-muted-foreground font-normal'>
            0%
          </Badge>
        )
      }
      return (
        <Badge
          variant='outline'
          className='gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
        >
          <Tag className='h-3 w-3' />
          {discount}% {t('customers.sheet.discount', 'OFF')}
        </Badge>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'minimum_order_amount',
    header: t('customerGroups.columns.minOrderAmount', 'Min. Order Amount'),
    cell: ({ row }) => {
      const amount = Number(row.getValue('minimum_order_amount')) || 0
      return (
        <div className='flex items-center gap-1 font-medium text-foreground text-sm'>
          <DollarSign className='h-3.5 w-3.5 text-muted-foreground' />
          <span>
            {new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(amount)}
          </span>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'enrolled_count',
    header: t('customerGroups.columns.enrolledCustomers', 'Enrolled Members'),
    cell: ({ row }) => {
      const count = row.original.enrolled_count ?? 0
      return (
        <Badge variant='secondary' className='gap-1.5 font-medium'>
          <Users className='h-3 w-3 text-muted-foreground' />
          <span>{count}</span>
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: t('customerGroups.columns.createdAt', 'Created At'),
    cell: ({ row }) => {
      const val = row.getValue('created_at') as string
      if (!val) return <span className='text-muted-foreground'>-</span>
      return (
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <Calendar className='h-3 w-3' />
          <span>{new Date(val).toLocaleDateString()}</span>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerGroupRowActions row={row} />,
  },
]
