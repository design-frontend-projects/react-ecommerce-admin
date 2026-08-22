import { Send, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SalesShipmentListItem } from '../data/schema'
import { useDispatchSalesShipment } from '../hooks/use-sales-shipments'

export function SalesShipmentRowActions({ row }: { row: SalesShipmentListItem }) {
  const dispatchShipment = useDispatchSalesShipment()

  const canDispatch = row.status === 'draft' || row.status === 'confirmed' || row.status === 'packed'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {canDispatch && (
          <DropdownMenuItem
            onClick={() => dispatchShipment.mutate(row.id)}
            disabled={dispatchShipment.isPending}
          >
            <Send className='me-2 h-4 w-4 text-emerald-600' />
            Dispatch & Fulfill Stock
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
