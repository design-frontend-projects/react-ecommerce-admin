import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UserDeleteDialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')

  const handleDelete = () => {
    if (value.trim() !== currentRow.username) return

    onOpenChange(false)
    showSubmittedData(currentRow, 'The following user has been deleted:')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.username}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          {t('users.deleteDialog.title')}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            <Trans
              i18nKey='users.deleteDialog.confirmPrompt'
              values={{ username: currentRow.username, role: currentRow.role.toUpperCase() }}
              components={{
                1: <span className='font-bold' />,
                3: <span className='font-bold' />,
                br: <br />,
              }}
            />
          </p>

          <Label className='my-2'>
            {t('users.deleteDialog.usernameLabel')}
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('users.deleteDialog.placeholder')}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('users.deleteDialog.warningTitle')}</AlertTitle>
            <AlertDescription>
              {t('users.deleteDialog.warningDesc')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('users.deleteDialog.confirmBtn')}
      destructive
    />
  )
}
