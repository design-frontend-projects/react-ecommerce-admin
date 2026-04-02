import { type CellContext } from '@tanstack/react-table'
import { MoreHorizontal, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StockBalanceRow } from '../data/schema'
import { useStockBalancesContext } from './stock-balances-provider'

export function StockBalancesRowActions({
  row,
}: CellContext<StockBalanceRow, unknown>) {
  const { setOpen, setCurrentRow } = useStockBalancesContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <span className='sr-only'>Open menu</span>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('adjust')
          }}
        >
          <Pencil className='mr-2 h-4 w-4' />
          Adjust Stock
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
