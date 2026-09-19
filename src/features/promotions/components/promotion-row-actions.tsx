import { type Row } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Edit, MoreHorizontal, Trash } from 'lucide-react'
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
import { type Promotion } from '../hooks/use-promotions'
import { usePromotionsContext } from './promotions-provider'

interface PromotionRowActionsProps<TData> {
  row: Row<TData>
}

export function PromotionRowActions<TData>({
  row,
}: PromotionRowActionsProps<TData>) {
  const { t } = useTranslation()
  const promotion = row.original as Promotion
  const { setOpen, setCurrentRow } = usePromotionsContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>{t('promotions.rowActions.openMenu', 'Open menu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <Can permission='sales.manage'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(promotion)
              setOpen('edit')
            }}
          >
            <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
            {t('promotions.rowActions.edit', 'Edit')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(promotion)
              setOpen('delete')
            }}
          >
            <Trash className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
            {t('promotions.rowActions.delete', 'Delete')}
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
