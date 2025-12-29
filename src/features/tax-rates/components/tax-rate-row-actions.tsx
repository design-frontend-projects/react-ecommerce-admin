import { Row } from '@tanstack/react-table'
import { Edit, MoreHorizontal, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaxRate } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

interface TaxRowActionsProps<TData> {
  row: Row<TData>
}

export function TaxRowActions<TData>({ row }: TaxRowActionsProps<TData>) {
  const rate = row.original as TaxRate
  const { setOpen, setCurrentRow } = useTaxContext()

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
            setCurrentRow(rate)
            setOpen('edit')
          }}
        >
          <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(rate)
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
