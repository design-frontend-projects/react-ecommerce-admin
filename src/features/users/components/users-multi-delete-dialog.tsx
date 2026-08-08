import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'

type UserMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = 'DELETE'

export function UsersMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: UserMultiDeleteDialogProps<TData>) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`Please type "${CONFIRM_WORD}" to confirm.`)
      return
    }

    onOpenChange(false)

    toast.promise(sleep(2000), {
      loading: 'Deleting users...',
      success: () => {
        setValue('')
        table.resetRowSelection()
        return `Deleted ${selectedRows.length} ${
          selectedRows.length > 1 ? 'users' : 'user'
        }`
      },
      error: 'Error',
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          {selectedRows.length === 1
            ? t('users.multiDeleteDialog.title', { count: selectedRows.length })
            : t('users.multiDeleteDialog.titlePlural', { count: selectedRows.length })}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            <Trans
              i18nKey='users.multiDeleteDialog.confirmPrompt'
              components={{ br: <br /> }}
            />
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span className=''>{t('users.multiDeleteDialog.confirmWordLabel', { word: CONFIRM_WORD })}</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('users.multiDeleteDialog.placeholder', { word: CONFIRM_WORD })}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('users.multiDeleteDialog.warningTitle')}</AlertTitle>
            <AlertDescription>
              {t('users.multiDeleteDialog.warningDesc')}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('users.multiDeleteDialog.confirmBtn')}
      destructive
    />
  )
}
