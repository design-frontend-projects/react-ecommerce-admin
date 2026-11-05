import { type ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { type Supplier } from '../hooks/use-suppliers'
import { SupplierRowActions } from './supplier-row-actions'

export const getColumns = (t: TFunction): ColumnDef<Supplier>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t('suppliers.table.selectAll', {
          defaultValue: 'Select all',
        })}
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t('suppliers.table.selectRow', {
          defaultValue: 'Select row',
        })}
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.name', { defaultValue: 'Supplier Name' })}
      />
    ),
    cell: ({ row }) => {
      const isPreferred = row.original.is_preferred
      const code = row.original.code
      return (
        <div className='flex min-w-[150px] flex-col gap-0.5'>
          <div className='flex items-center gap-1.5 font-medium'>
            <span>{row.getValue('name')}</span>
            {isPreferred && (
              <span
                title={t('suppliers.columns.preferred', {
                  defaultValue: 'Preferred',
                })}
              >
                <Star className='h-3.5 w-3.5 fill-amber-500 text-amber-500' />
              </span>
            )}
          </div>
          {code && (
            <span className='font-mono text-xs text-muted-foreground'>
              {code}
            </span>
          )}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'contact_person',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.contactPerson', {
          defaultValue: 'Contact Person',
        })}
      />
    ),
    cell: ({ row }) => (
      <div className='min-w-[120px]'>
        {row.getValue('contact_person') || (
          <span className='text-muted-foreground'>-</span>
        )}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.email', { defaultValue: 'Email' })}
      />
    ),
    cell: ({ row }) => {
      const email = row.getValue('email') as string | undefined
      if (!email) return <span className='text-muted-foreground'>-</span>
      return (
        <a
          href={`mailto:${email}`}
          className='block max-w-[180px] truncate text-primary hover:underline'
        >
          {email}
        </a>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.phone', { defaultValue: 'Phone' })}
      />
    ),
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string | undefined
      if (!phone) return <span className='text-muted-foreground'>-</span>
      return (
        <a href={`tel:${phone}`} className='font-mono text-xs hover:underline'>
          {phone}
        </a>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'tax_number',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.taxNumber', {
          defaultValue: 'Tax / VAT ID',
        })}
      />
    ),
    cell: ({ row }) => (
      <div className='font-mono text-xs text-muted-foreground'>
        {row.getValue('tax_number') || '-'}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'payment_terms_days',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.paymentTerms', {
          defaultValue: 'Terms (Days)',
        })}
      />
    ),
    cell: ({ row }) => {
      const days = row.getValue('payment_terms_days') as
        | number
        | null
        | undefined
      if (days === null || days === undefined) {
        return <span className='text-muted-foreground'>-</span>
      }
      return (
        <Badge variant='outline' className='font-mono text-xs'>
          {days} {t('common.days', { defaultValue: 'days' })}
        </Badge>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.status', { defaultValue: 'Status' })}
      />
    ),
    cell: ({ row }) => {
      const isActive = row.original.is_active !== false
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20 dark:bg-emerald-500/20 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
          }
        >
          {isActive
            ? t('suppliers.table.activeOnly', { defaultValue: 'Active' })
            : t('suppliers.table.inactiveOnly', { defaultValue: 'Inactive' })}
        </Badge>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={t('suppliers.columns.createdAt', { defaultValue: 'Created At' })}
      />
    ),
    cell: ({ row }) => {
      const val = row.getValue('created_at')
      if (!val) {
        return (
          <div className='flex w-[100px] items-center text-muted-foreground'>
            -
          </div>
        )
      }
      return (
        <div className='flex w-[100px] items-center text-xs text-muted-foreground'>
          {new Date(val as string | number | Date).toLocaleDateString()}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <SupplierRowActions row={row} />,
  },
]

// Fallback for static callers
export const columns: ColumnDef<Supplier>[] = getColumns((key, def) =>
  typeof def === 'string'
    ? def
    : (def as { defaultValue?: string })?.defaultValue || key
)
