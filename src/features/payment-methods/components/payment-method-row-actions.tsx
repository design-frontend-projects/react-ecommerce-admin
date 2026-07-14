import { type Row } from '@tanstack/react-table'
import { Edit, MoreHorizontal, Star, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type PaymentMethod,
  useSetDefaultPaymentMethod,
} from '../hooks/use-payment-methods'
import { usePaymentMethodsContext } from './payment-methods-provider'

interface PaymentMethodRowActionsProps<TData> {
  row: Row<TData>
}

export function PaymentMethodRowActions<TData>({
  row,
}: PaymentMethodRowActionsProps<TData>) {
  const paymentMethod = row.original as PaymentMethod
  const { setOpen, setCurrentRow } = usePaymentMethodsContext()
  const setDefaultMutation = useSetDefaultPaymentMethod()

  const handleSetDefault = async () => {
    try {
      await setDefaultMutation.mutateAsync(paymentMethod.id)
      toast.success(
        `"${paymentMethod.name}" is now the default payment method.`
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to set default payment method.')
    }
  }

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
            setCurrentRow(paymentMethod)
            setOpen('update')
          }}
        >
          <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          Edit
        </DropdownMenuItem>
        {!paymentMethod.is_default && (
          <DropdownMenuItem onClick={handleSetDefault}>
            <Star className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
            Set as Default
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(paymentMethod)
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
