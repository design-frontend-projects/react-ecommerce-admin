import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { User } from '../data/types'
import { useDeactivateUser } from '../hooks/use-users'

type DeactivateUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
}: DeactivateUserDialogProps) {
  const [value, setValue] = useState('')
  const deactivateMutation = useDeactivateUser()

  const handleDeactivate = () => {
    if (!user) return
    if (value.trim() !== user.email) return

    deactivateMutation.mutate(user.id, {
      onSuccess: () => {
        onOpenChange(false)
        setValue('')
      },
    })
  }

  if (!user) return null

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) setValue('')
      }}
      handleConfirm={handleDeactivate}
      disabled={value.trim() !== user.email || deactivateMutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Deactivate User
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2 text-foreground'>
            Are you sure you want to deactivate{' '}
            <span className='font-bold'>{user.email}</span>?
            <br />
            This will immediately revoke their access to the system. You can
            reactivate them later if needed.
          </p>

          <Label className='my-2 block'>
            Email Address:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter email address to confirm.'
              className='mt-1'
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              This user will be logged out of all active sessions and will not
              be able to log back in.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='Deactivate'
      destructive
    />
  )
}
