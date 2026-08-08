import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
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
  const { t } = useTranslation()
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
          {t('users.deactivateDialog.title')}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2 text-foreground'>
            <Trans
              i18nKey='users.deactivateDialog.confirmPrompt'
              values={{ email: user.email }}
              components={{
                1: <span className='font-bold' />,
                br: <br />,
              }}
            />
          </p>

          <Label className='my-2 block'>
            {t('users.deactivateDialog.emailLabel')}
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('users.deactivateDialog.emailPlaceholder')}
              className='mt-1'
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('users.deactivateDialog.warningTitle')}</AlertTitle>
            <AlertDescription>
              {t('users.deactivateDialog.warningDesc')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('users.deactivateDialog.confirmBtn')}
      destructive
    />
  )
}
