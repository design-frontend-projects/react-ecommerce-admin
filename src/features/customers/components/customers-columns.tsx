import { type ColumnDef } from '@tanstack/react-table'
import { type TFunction } from 'i18next'
import {
  Mail,
  Phone,
  Star,
  Tag,
  MapPin,
  Calendar,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import i18n from '@/config/i18n'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { type Customer } from '../hooks/use-customers'
import { CustomerRowActions } from './customer-row-actions'
import { useCustomersContext } from './customers-provider'

function CustomerNameCell({ customer }: { customer: Customer }) {
  const { setOpen, setCurrentRow } = useCustomersContext()
  const fullName = `${customer.first_name} ${customer.last_name}`
  const initials = `${customer.first_name[0] || ''}${customer.last_name[0] || ''}`.toUpperCase()

  return (
    <div
      className='flex items-center gap-3 py-1 cursor-pointer group'
      onClick={() => {
        setCurrentRow(customer)
        setOpen('view')
      }}
    >
      <Avatar className='h-9 w-9 border border-border shadow-2xs group-hover:border-primary/50 transition-colors'>
        <AvatarFallback className='bg-primary/10 text-primary font-semibold text-xs'>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className='flex flex-col min-w-0'>
        <span className='font-semibold text-foreground group-hover:text-primary transition-colors truncate'>
          {fullName}
        </span>
        <div className='flex items-center gap-1.5'>
          {customer.code ? (
            <span className='font-mono text-[11px] text-muted-foreground'>
              {customer.code}
            </span>
          ) : (
            <span className='text-[11px] text-muted-foreground/60 italic'>
              No code
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactCell({ email, phone }: { email: string | null; phone: string | null }) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (e: React.MouseEvent, text: string, type: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className='flex flex-col gap-1 text-xs'>
      {email && (
        <div className='flex items-center gap-1.5 text-muted-foreground hover:text-foreground'>
          <Mail className='h-3 w-3 shrink-0 text-muted-foreground' />
          <a
            href={`mailto:${email}`}
            className='truncate hover:underline'
            onClick={(e) => e.stopPropagation()}
          >
            {email}
          </a>
          <button
            type='button'
            onClick={(e) => handleCopy(e, email, 'email')}
            className='text-muted-foreground/60 hover:text-foreground'
          >
            {copied === 'email' ? (
              <Check className='h-2.5 w-2.5 text-emerald-500' />
            ) : (
              <Copy className='h-2.5 w-2.5' />
            )}
          </button>
        </div>
      )}
      {phone && (
        <div className='flex items-center gap-1.5 text-muted-foreground hover:text-foreground'>
          <Phone className='h-3 w-3 shrink-0 text-muted-foreground' />
          <a
            href={`tel:${phone}`}
            className='hover:underline font-mono text-[11px]'
            onClick={(e) => e.stopPropagation()}
          >
            {phone}
          </a>
          <button
            type='button'
            onClick={(e) => handleCopy(e, phone, 'phone')}
            className='text-muted-foreground/60 hover:text-foreground'
          >
            {copied === 'phone' ? (
              <Check className='h-2.5 w-2.5 text-emerald-500' />
            ) : (
              <Copy className='h-2.5 w-2.5' />
            )}
          </button>
        </div>
      )}
      {!email && !phone && (
        <span className='text-muted-foreground/60 italic'>-</span>
      )}
    </div>
  )
}

export const getColumns = (t: TFunction = i18n.t): ColumnDef<Customer>[] => [
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
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    id: 'name',
    header: t('customers.columns.name', 'Customer'),
    cell: ({ row }) => <CustomerNameCell customer={row.original} />,
    enableSorting: true,
  },
  {
    id: 'contact',
    header: t('customers.sheet.contactInfo', 'Contact'),
    cell: ({ row }) => (
      <ContactCell
        email={row.original.email}
        phone={row.original.phone}
      />
    ),
  },
  {
    id: 'group',
    header: t('customers.columns.group', 'Group'),
    cell: ({ row }) => {
      const group = row.original.customer_groups
      if (!group?.name) {
        return (
          <span className='text-xs text-muted-foreground/60 italic'>
            {t('customers.form.noGroup', 'No group')}
          </span>
        )
      }

      const discount = Number(group.discount_percentage) || 0

      return (
        <div className='flex items-center gap-1.5 flex-wrap'>
          <Badge variant='secondary' className='gap-1 font-medium text-xs'>
            <Tag className='h-2.5 w-2.5' />
            <span>{group.name}</span>
          </Badge>
          {discount > 0 && (
            <Badge
              variant='outline'
              className='text-[10px] px-1 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
            >
              {discount}%
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'location',
    header: t('customers.columns.location', 'Location'),
    cell: ({ row }) => {
      const city = row.original.city
      const country = row.original.country
      if (!city && !country) {
        return <span className='text-xs text-muted-foreground/60 italic'>-</span>
      }
      return (
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <MapPin className='h-3 w-3 shrink-0' />
          <span className='truncate max-w-[120px]'>
            {city ? `${city}${country ? `, ${country}` : ''}` : country}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'loyalty_points',
    header: t('customers.columns.loyaltyPoints', 'Points'),
    cell: ({ row }) => {
      const points = row.original.loyalty_points || 0
      return (
        <Badge
          variant={points > 0 ? 'outline' : 'secondary'}
          className={`gap-1 font-medium text-xs ${
            points > 0
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground'
          }`}
        >
          <Star className={`h-3 w-3 ${points > 0 ? 'fill-amber-500' : ''}`} />
          <span>{points}</span>
        </Badge>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'is_active',
    header: t('customers.columns.status', 'Status'),
    cell: ({ row }) => {
      const isActive = row.original.is_active ?? true
      return isActive ? (
        <Badge
          variant='outline'
          className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-medium'
        >
          {t('common.active', 'Active')}
        </Badge>
      ) : (
        <Badge variant='outline' className='bg-muted text-muted-foreground text-xs'>
          {t('common.inactive', 'Inactive')}
        </Badge>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'created_at',
    header: t('customers.columns.joined', 'Joined'),
    cell: ({ row }) => {
      const dateVal = row.getValue('created_at') as string
      if (!dateVal) return <span className='text-muted-foreground'>-</span>
      return (
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <Calendar className='h-3 w-3 shrink-0' />
          <span>{new Date(dateVal).toLocaleDateString()}</span>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerRowActions row={row} />,
  },
]

export const columns: ColumnDef<Customer>[] = getColumns()
