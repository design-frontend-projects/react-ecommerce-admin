import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Trash2, Edit } from 'lucide-react'
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
}

export function InventoryRowActions<TData>({
  row,
}: InventoryRowActionsProps<TData>) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useInventoryContext()

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
      <DropdownMenuContent align='end' className='w-[160px]'>
        <Can permission='inventory.manage'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original as Inventory)
              setOpen('edit')
            }}
          >
            {t('common.edit', 'Edit')}
            <DropdownMenuShortcut>
              <Edit size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original as Inventory)
              setOpen('delete')
            }}
            className='text-red-500!'
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
