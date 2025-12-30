import { type Row } from '@tanstack/react-table'
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
import { type CustomerCard } from '../hooks/use-customer-cards'
import { useCustomerCardsContext } from './customer-cards-provider'

interface CustomerCardRowActionsProps<TData> {
  row: Row<TData>
}

export function CustomerCardRowActions<TData>({
  row,
}: CustomerCardRowActionsProps<TData>) {
  const card = row.original as CustomerCard
  const { setOpen, setCurrentRow } = useCustomerCardsContext()

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
            setCurrentRow(card)
            setOpen('edit')
          }}
        >
          <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(card)
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
