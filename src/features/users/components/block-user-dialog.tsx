import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, ShieldCheck, AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { type User } from '../data/schema'
import { useBlockUser, useUnblockUser } from '../hooks/use-users'

type BlockUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
  action: 'block' | 'unblock'
}

export function BlockUserDialog({
  open,
  onOpenChange,
  currentRow,
  action,
}: BlockUserDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const blockUser = useBlockUser()
  const unblockUser = useUnblockUser()

  const isBlock = action === 'block'

  const handleConfirm = () => {
    if (isBlock) {
      blockUser.mutate(
        { userId: currentRow.authUserId, reason },
        {
          onSuccess: () => {
            onOpenChange(false)
            setReason('')
          },
        }
      )
    } else {
      unblockUser.mutate(
        { userId: currentRow.authUserId },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        }
      )
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleConfirm}
      isLoading={blockUser.isPending || unblockUser.isPending}
      title={
        isBlock ? (
          <span className='text-amber-600 dark:text-amber-500 flex items-center gap-2'>
            <Ban size={18} />
            {t('users.blockDialog.blockTitle', 'Block User Account')}
          </span>
        ) : (
          <span className='text-emerald-600 dark:text-emerald-500 flex items-center gap-2'>
            <ShieldCheck size={18} />
            {t('users.blockDialog.unblockTitle', 'Unblock User Account')}
          </span>
        )
      }
      desc={
        <div className='space-y-4 py-1 text-sm'>
          <p>
            {isBlock
              ? t(
                  'users.blockDialog.blockDesc',
                  `Are you sure you want to block ${currentRow.firstName || currentRow.username} (${currentRow.email})? They will immediately be prohibited from signing into the application.`
                )
              : t(
                  'users.blockDialog.unblockDesc',
                  `Are you sure you want to unblock ${currentRow.firstName || currentRow.username} (${currentRow.email})? They will regain access to their account.`
                )}
          </p>

          {isBlock && (
            <div className='space-y-1.5'>
              <Label htmlFor='block-reason' className='text-xs font-medium'>
                {t('users.blockDialog.reasonLabel', 'Reason for blocking (optional)')}
              </Label>
              <Textarea
                id='block-reason'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t(
                  'users.blockDialog.reasonPlaceholder',
                  'E.g. Policy violation, suspicious activity, employment terminated...'
                )}
                className='text-xs'
                rows={3}
              />
            </div>
          )}
        </div>
      }
      confirmText={
        isBlock
          ? t('users.blockDialog.confirmBlock', 'Block User')
          : t('users.blockDialog.confirmUnblock', 'Unblock User')
      }
      destructive={isBlock}
    />
  )
}
