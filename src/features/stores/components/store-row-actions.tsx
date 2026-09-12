import { useTranslation } from 'react-i18next'
import type { Row } from '@tanstack/react-table'
import { MoreHorizontal, Edit, Trash2, Warehouse, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStoresContext } from './stores-provider'

interface StoreRowActionsProps {
  row: Row<any>
}

export function StoreRowActions({ row }: StoreRowActionsProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useStoresContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>{t('stores.actions.openMenu', 'Open menu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[190px]'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('priceLists')
          }}
        >
          <Layers className='mr-2 h-4 w-4 text-primary' />
          {t('stores.actions.managePriceLists', 'Assigned Price Lists')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('warehouses')
          }}
        >
          <Warehouse className='mr-2 h-4 w-4 text-primary' />
          {t('stores.actions.manageWarehouses', 'Fulfillment Hubs')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('edit')
          }}
        >
          <Edit className='mr-2 h-4 w-4' />
          {t('stores.actions.edit', 'Edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('delete')
          }}
          className='text-rose-500 focus:text-rose-500'
        >
          <Trash2 className='mr-2 h-4 w-4' />
          {t('stores.actions.delete', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
