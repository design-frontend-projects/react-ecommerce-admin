import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type TaxRate } from '../hooks/use-tax-rates'
import { TaxRowActions } from './tax-rate-row-actions'

export const columns: ColumnDef<TaxRate>[] = [
  {
    accessorKey: 'tax_type',
    header: 'Tax Type',
  },
  {
    accessorKey: 'rate',
    header: 'Rate (%)',
    cell: ({ row }) => <div>{row.getValue('rate')}%</div>,
  },
  {
    id: 'country',
    header: 'Country',
    accessorFn: (row) =>
      row.countries ? `${row.countries.name} (${row.countries.code})` : 'N/A',
  },
  {
    accessorKey: 'is_inclusive',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant={row.getValue('is_inclusive') ? 'outline' : 'secondary'}>
        {row.getValue('is_inclusive') ? 'Inclusive' : 'Exclusive'}
      </Badge>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div
        className='max-w-[200px] truncate'
        title={row.getValue('description') || ''}
      >
        {row.getValue('description') || '—'}
      </div>
    ),
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
    id: 'actions',
    cell: ({ row }) => <TaxRowActions row={row} />,
  },
]
