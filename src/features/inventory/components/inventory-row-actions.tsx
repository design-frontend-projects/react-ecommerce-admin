import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Trash2, Edit, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import { type Inventory } from '../data/schema'
import { useInventoryContext } from './inventory-provider'

interface InventoryRowActionsProps<TData> {
  row: Row<TData>
  onOpenDetail?: (item: Inventory) => void
}

export function InventoryRowActions<TData>({
  row,
  onOpenDetail,
}: InventoryRowActionsProps<TData>) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow, openDetail } = useInventoryContext()

  const item = row.original as Inventory

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>{t('common.openMenu', 'Open menu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[170px]'>
        <DropdownMenuItem
          onClick={() => {
            if (onOpenDetail) {
              onOpenDetail(item)
            } else {
              openDetail(item)
            }
          }}
        >
          {t('common.viewDetails', 'View Details')}
          <DropdownMenuShortcut>
            <Eye size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>

        <Can permission='inventory.manage'>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(item)
              setOpen('edit')
            }}
          >
            {t('common.edit', 'Edit Settings')}
            <DropdownMenuShortcut>
              <Edit size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(item)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            {t('common.delete', 'Delete')}
            <DropdownMenuShortcut>
              <Trash2 size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
