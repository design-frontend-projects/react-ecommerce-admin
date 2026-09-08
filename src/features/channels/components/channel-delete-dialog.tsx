import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteChannel } from '../hooks/use-channels'
import { useChannelsContext } from './channels-provider'

export function ChannelDeleteDialog() {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const { open, setOpen, currentRow } = useChannelsContext()
  const deleteMutation = useDeleteChannel()

  const handleDelete = async () => {
    if (!currentRow) return

    try {
      await deleteMutation.mutateAsync(currentRow.id)
      toast.success(
        t('channels.notifications.deleteSuccess', {
          defaultValue: 'Sales channel deleted successfully.',
        })
      )
      setOpen(null)
      setValue('')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete channel.'
      toast.error(message)
    }
  }

  const isConfirmed = currentRow ? value.trim() === currentRow.name.trim() : false

  return (
    <ConfirmDialog
      open={open === 'delete'}
      onOpenChange={(val) => {
        if (!val) {
          setOpen(null)
          setValue('')
        }
      }}
      title={
        <span className='text-destructive'>
          {t('channels.dialog.deleteTitle', { defaultValue: 'Delete Sales Channel' })}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            {t('channels.dialog.deleteWarning', {
              defaultValue:
                'Are you sure you want to delete this channel? This action cannot be undone.',
            })}
          </p>

          <div className='rounded-md border bg-muted/40 p-3'>
            <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              {t('channels.fields.code', { defaultValue: 'Channel Code' })}: {currentRow?.code}
            </div>
            <div className='text-base font-bold text-foreground'>
              {currentRow?.name}
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs font-medium'>
              {t('channels.dialog.confirmTypePrompt', {
                defaultValue: 'Type channel name to confirm deletion:',
              })}
              <span className='ml-1 font-semibold text-foreground'>
                {currentRow?.name}
              </span>
            </Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={currentRow?.name || ''}
              className='border-destructive/40 focus-visible:ring-destructive/30'
            />
          </div>

          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>{t('common.warning', { defaultValue: 'Warning' })}</AlertTitle>
            <AlertDescription>
              {t('channels.dialog.cascadeAlert', {
                defaultValue:
                  'If this channel is linked to active price lists or sales orders, deletion will be blocked by foreign key integrity.',
              })}
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText={
        deleteMutation.isPending ? (
          <span className='flex items-center gap-1'>
            <Loader2 className='h-4 w-4 animate-spin' />
            {t('common.deleting', { defaultValue: 'Deleting...' })}
          </span>
        ) : (
          t('common.delete', { defaultValue: 'Delete' })
        )
      }
      destructive
      disabled={!isConfirmed || deleteMutation.isPending}
      handleConfirm={handleDelete}
    />
  )
}
