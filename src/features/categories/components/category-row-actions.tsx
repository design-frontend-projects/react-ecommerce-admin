import { type Row } from '@tanstack/react-table'
import { Edit, FolderPlus, MoreHorizontal, Trash } from 'lucide-react'
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
import { type Category } from '../hooks/use-categories'
import { useCategoriesContext } from './categories-provider'

interface CategoryRowActionsProps<TData> {
  row: Row<TData>
}

export function CategoryRowActions<TData>({
  row,
}: CategoryRowActionsProps<TData>) {
  const { t } = useTranslation()
  const category = row.original as Category
  const { setOpen, setCurrentRow, setPresetParentId } = useCategoriesContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[190px]'>
        <Can permission='products.manage'>
          <DropdownMenuItem
            onClick={() => {
              setPresetParentId(category.id)
              setCurrentRow(null)
              setOpen('create')
            }}
          >
            <FolderPlus className='mr-2 h-3.5 w-3.5 text-primary' />
            {t('categories.addSubcategory', { defaultValue: 'Add Subcategory' })}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(category)
              setOpen('edit')
            }}
          >
            <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
            {t('common.edit', { defaultValue: 'Edit' })}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(category)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            <Trash className='mr-2 h-3.5 w-3.5' />
            {t('common.delete', { defaultValue: 'Delete' })}
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
