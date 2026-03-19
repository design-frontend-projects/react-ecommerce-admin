import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteCurrency } from '../hooks/use-currencies'
import { useCurrenciesContext } from './currencies-provider'

export function CurrencyDeleteDialog() {
  const [value, setValue] = useState('')
  const { open, setOpen, currentRow } = useCurrenciesContext()
  const deleteMutation = useDeleteCurrency()

  const handleDelete = async () => {
    if (!currentRow) return

    try {
      await deleteMutation.mutateAsync(currentRow.id)
      toast.success('Currency deleted successfully.')
      setOpen(null)
      setValue('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete currency.')
    }
  }

  return (
    <ConfirmDialog
      open={open === 'delete'}
      onOpenChange={(val) => {
        if (!val) {
          setOpen(null)
          setValue('')
        }
      }}
      title={<span className='text-destructive'>Delete Currency</span>}
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Are you sure you want to delete{' '}
            <span className='font-bold'>{currentRow?.name}</span>?
            <br />
            This action will permanently remove the currency from the system and
            cannot be undone.
          </p>

          <Label className='my-2'>
            Type:
            <span className='ml-1 font-mono text-muted-foreground'>
              {currentRow?.name}
            </span>
          </Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Enter currency name to confirm'
          />

          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Any data associated with this currency might be affected. If this
              currency is in use, the deletion may fail.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='Delete'
      destructive
      disabled={value.trim() !== currentRow?.name || deleteMutation.isPending}
      handleConfirm={handleDelete}
    />
  )
}
