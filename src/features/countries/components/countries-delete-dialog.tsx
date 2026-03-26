import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Country } from '../data/schema'
import { useDeleteCountry } from '../hooks/use-countries'

type CountryDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Country
}

export function CountriesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: CountryDeleteDialogProps) {
  const [value, setValue] = useState('')
  const deleteCountry = useDeleteCountry()

  const handleDelete = () => {
    if (value.trim() !== currentRow.name) return

    deleteCountry.mutate(currentRow.id, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success('Country deleted', {
          description: `Country ${currentRow.name} has been permanently deleted.`,
        })
      },
      onError: (error) => {
        toast.error('Failed to delete country', {
          description: error.message,
        })
      },
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.name || deleteCountry.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete Country
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Are you sure you want to delete{' '}
            <span className='font-bold'>{currentRow.name}</span>?
            <br />
            This action will permanently remove the country and potentially affect associated cities. This cannot be undone.
          </p>

          <Label className='my-2'>
            Country Name:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter country name to confirm deletion.'
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation cannot be rolled back.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='Delete'
      destructive
    />
  )
}
