import { Row } from '@tanstack/react-table'
import { Edit, List, MoreHorizontal, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PurchaseOrder } from '../hooks/use-purchase-orders'
import { usePOContext } from './purchase-orders-provider'

interface PORowActionsProps<TData> {
  row: Row<TData>
}

export function PORowActions<TData>({ row }: PORowActionsProps<TData>) {
  const po = row.original as PurchaseOrder
  const { setOpen, setCurrentRow } = usePOContext()

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
            setCurrentRow(po)
            setOpen('items')
          }}
        >
          <List className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Order Items
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(po)
            setOpen('edit')
          }}
        >
          <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Edit Order
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(po)
            setOpen('delete')
          }}
        >
          <Trash className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
