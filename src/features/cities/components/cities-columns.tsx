import { ColumnDef } from '@tanstack/react-table'
import { City } from '../hooks/use-cities'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CitiesActionMenu } from './cities-action-menu'

export const columns: ColumnDef<City>[] = [
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'country_id',
    header: 'Country',
    cell: ({ row }) => {
      // @ts-ignore
      return row.original.countries?.name || row.original.country_id
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.original.is_active
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => {
      if (!row.original.created_at) return null
      return format(new Date(row.original.created_at), 'PPP')
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CitiesActionMenu city={row.original} />,
  },
]
