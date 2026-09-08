import { type Row } from '@tanstack/react-table'
import { MoreHorizontal, Edit, Trash, Eye } from 'lucide-react'
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
import { type PriceList } from '../data/schema'
import { usePriceListContext } from './price-list-provider'

interface PriceListRowActionsProps {
  row: Row<PriceList>
}

export function PriceListRowActions({ row }: PriceListRowActionsProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = usePriceListContext()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>{t('common.openMenu', { defaultValue: 'Open menu' })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('view')
          }}
          className='cursor-pointer'
        >
          <Eye className='mr-2 h-4 w-4' />
          {t('common.view', { defaultValue: 'View Details' })}
        </DropdownMenuItem>
        <Can permission='sales.manage'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('edit')
            }}
            className='cursor-pointer'
          >
            <Edit className='mr-2 h-4 w-4' />
            {t('common.edit', { defaultValue: 'Edit' })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('delete')
            }}
            className='cursor-pointer text-destructive focus:text-destructive'
          >
            <Trash className='mr-2 h-4 w-4' />
            {t('common.delete', { defaultValue: 'Delete' })}
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
