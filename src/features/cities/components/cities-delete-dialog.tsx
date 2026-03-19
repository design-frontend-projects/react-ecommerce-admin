'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteCity } from '../hooks/use-cities'
import { type City } from '../data/schema'

type CityDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: City
}

export function CitiesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: CityDeleteDialogProps) {
  const [value, setValue] = useState('')
  const deleteCity = useDeleteCity()

  const handleDelete = () => {
    if (value.trim() !== currentRow.name) return

    deleteCity.mutate(currentRow.id, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success('City deleted successfully')
      },
      onError: (error) => {
        toast.error('Failed to delete city', {
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
      disabled={value.trim() !== currentRow.name}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete City
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Are you sure you want to delete{' '}
            <span className='font-bold'>{currentRow.name}</span>?
            <br />
            This action will permanently remove the city from the system. This cannot be undone.
          </p>

          <Label className='my-2'>
            City Name:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter city name to confirm deletion.'
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
