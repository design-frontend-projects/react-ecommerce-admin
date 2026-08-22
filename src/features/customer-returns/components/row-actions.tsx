import { Check, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CustomerReturnListItem } from '../data/schema'
import { useReceiveCustomerReturn } from '../hooks/use-customer-returns'

export function CustomerReturnRowActions({ row }: { row: CustomerReturnListItem }) {
  const receiveReturn = useReceiveCustomerReturn()

  const canReceive = row.status === 'draft' || row.status === 'approved'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {canReceive && (
          <DropdownMenuItem
            onClick={() => receiveReturn.mutate(row.id)}
            disabled={receiveReturn.isPending}
          >
            <Check className='me-2 h-4 w-4 text-emerald-600' />
            Receive Return & Restock
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
