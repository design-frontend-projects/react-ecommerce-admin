import { MoreHorizontal, Pencil, Trash2, PackageCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'

interface PORowActionsProps {
  row: PurchaseOrder
}

export function PORowActions({ row }: PORowActionsProps) {
  const { setOpen, setCurrentRow } = usePOContext()

  const canReceive = row.status === 'pending' || row.status === 'partial'
  const canEdit = row.status === 'pending'
  const canCancel = row.status === 'pending' || row.status === 'partial'
  const canDelete = row.status === 'pending' || row.status === 'cancelled'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <span className='sr-only'>Open menu</span>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row)
              setOpen('edit')
            }}
          >
            <Pencil className='mr-2 h-4 w-4' />
            Edit
          </DropdownMenuItem>
        )}

        {canReceive && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row)
              setOpen('receive')
            }}
          >
            <PackageCheck className='mr-2 h-4 w-4' />
            Receive Items
          </DropdownMenuItem>
        )}

        {canCancel && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row)
              setOpen('delete') // reuse delete dialog as cancel
            }}
            className='text-amber-600 focus:text-amber-600'
          >
            <XCircle className='mr-2 h-4 w-4' />
            Cancel Order
          </DropdownMenuItem>
        )}

        {(canEdit || canReceive || canCancel) && canDelete && (
          <DropdownMenuSeparator />
        )}

        {canDelete && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
