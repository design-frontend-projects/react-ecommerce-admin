import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Layers, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WarehouseListItem } from '../data/schema'
import { useWarehousesContext } from './provider'

export function WarehouseRowActions({ row }: { row: WarehouseListItem }) {
  const { t } = useTranslation()
  const { setCurrentRow, setOpen } = useWarehousesContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8 p-0'>
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row)
            setOpen('locations')
          }}
        >
          <Layers className='me-2 h-4 w-4 text-violet-500' />
          {t('warehouses.manageLocations', 'Manage locations')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row)
            setOpen('edit')
          }}
        >
          <Pencil className='me-2 h-4 w-4 text-blue-500' />
          {t('common.edit', 'Edit')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className='text-rose-600 focus:text-rose-600'
          onClick={() => {
            setCurrentRow(row)
            setOpen('delete')
          }}
        >
          <Trash2 className='me-2 h-4 w-4' />
          {t('common.delete', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
