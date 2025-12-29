import { Row } from '@tanstack/react-table'
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
import { Promotion } from '../hooks/use-promotions'
import { usePromotionsContext } from './promotions-provider'

interface PromotionRowActionsProps<TData> {
  row: Row<TData>
}

export function PromotionRowActions<TData>({
  row,
}: PromotionRowActionsProps<TData>) {
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
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(promotion)
            setOpen('edit')
          }}
        >
          <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(promotion)
            setOpen('delete')
          }}
        >
          <Trash className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Delete
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
