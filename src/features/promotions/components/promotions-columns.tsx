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
    accessorKey: 'discount_value',
    header: 'Discount',
    cell: ({ row }) => {
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
