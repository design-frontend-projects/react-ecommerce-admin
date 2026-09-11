import { useTranslation } from 'react-i18next'
import {
  MoreHorizontal,
  Layers,
  Pencil,
  Trash2,
  Eye,
  Copy,
} from 'lucide-react'
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
  const { openDetail, openLocations, openEdit, openDelete, openDuplicate } =
    useWarehousesContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 p-0 cursor-pointer'
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            openDetail(row)
          }}
        >
          <Eye className='me-2 h-4 w-4 text-primary' />
          {t('warehouses.viewDetails', 'View Details')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            openLocations(row)
          }}
        >
          <Layers className='me-2 h-4 w-4 text-violet-500' />
          {t('warehouses.manageLocations', 'Manage locations')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            openDuplicate(row)
          }}
        >
          <Copy className='me-2 h-4 w-4 text-emerald-500' />
          {t('warehouses.duplicate', 'Duplicate')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            openEdit(row)
          }}
        >
          <Pencil className='me-2 h-4 w-4 text-blue-500' />
          {t('common.edit', 'Edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          onClick={(e) => {
            e.stopPropagation()
            openDelete(row)
          }}
        >
          <Trash2 className='me-2 h-4 w-4' />
          {t('common.delete', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

