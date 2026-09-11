import { type Row } from '@tanstack/react-table'
import { Eye, Edit, MoreHorizontal, Trash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import { type Customer } from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

interface CustomerRowActionsProps<TData> {
  row: Row<TData>
}

export function CustomerRowActions<TData>({
  row,
}: CustomerRowActionsProps<TData>) {
  const { t } = useTranslation()
  const customer = row.original as Customer
  const { setOpen, setCurrentRow } = useCustomersContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>{t('common.openMenu', 'Open menu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[170px]'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(customer)
            setOpen('view')
          }}
        >
          <Eye className='me-2 h-3.5 w-3.5 text-muted-foreground' />
          <span>{t('customers.sheet.quickView', 'View Profile')}</span>
        </DropdownMenuItem>

        <Can permission='sales.manage'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(customer)
              setOpen('edit')
            }}
          >
            <Edit className='me-2 h-3.5 w-3.5 text-muted-foreground' />
            <span>{t('common.edit', 'Edit')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(customer)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            <Trash className='me-2 h-3.5 w-3.5' />
            <span>{t('common.delete', 'Delete')}</span>
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
