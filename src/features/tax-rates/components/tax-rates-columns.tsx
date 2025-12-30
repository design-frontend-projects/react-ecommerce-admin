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
    accessorKey: 'country_code',
    header: 'Country',
  },
  {
    accessorKey: 'state_province',
    header: 'State/Province',
    cell: ({ row }) => <div>{row.getValue('state_province') || 'N/A'}</div>,
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
