import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightCircle,
  Check,
  Eye,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import type { RequisitionListItem } from '../data/schema'
import {
  useCancelRequisition,
  useRequisitionAction,
} from '../hooks/use-purchase-requisitions'
import { useRequisitionsContext } from './provider'

export function RequisitionRowActions({ row }: { row: RequisitionListItem }) {
  const { t } = useTranslation()
  const { setCurrentRow, setOpen } = useRequisitionsContext()
  const requisitionAction = useRequisitionAction()
  const cancelRequisition = useCancelRequisition()
  const [confirmConvert, setConfirmConvert] = useState(false)

  const isDraft = row.status === 'draft'
  const isSubmitted = row.status === 'submitted'
  const isApproved = row.status === 'approved'
  const isCancelled = row.status === 'cancelled'

  const handleConvert = async () => {
    try {
      await requisitionAction.mutateAsync({ id: row.id, action: 'convert' })
      setConfirmConvert(false)
    } catch {
      setConfirmConvert(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>{t('common.openMenu', 'Open menu')}</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row)
              setOpen('view')
            }}
          >
            <Eye className='mr-2 h-4 w-4' />
            {t('purchaseRequisitions.actions.viewSummary', 'View Summary')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <Can permission='purchasing.manage'>
            {isDraft && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentRow(row)
                    setOpen('edit')
                  }}
                >
                  <Pencil className='mr-2 h-4 w-4' />
                  {t('purchaseRequisitions.actions.edit', 'Edit Requisition')}
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={requisitionAction.isPending}
                  onClick={() =>
                    requisitionAction.mutate({ id: row.id, action: 'submit' })
                  }
                >
                  <Send className='mr-2 h-4 w-4' />
                  {t('purchaseRequisitions.actions.submit', 'Submit for Approval')}
                </DropdownMenuItem>
              </>
            )}

            {isSubmitted && (
              <>
                <DropdownMenuItem
                  disabled={requisitionAction.isPending}
                  onClick={() =>
                    requisitionAction.mutate({ id: row.id, action: 'approve' })
                  }
                >
                  <Check className='mr-2 h-4 w-4 text-emerald-600' />
                  {t('purchaseRequisitions.actions.approve', 'Approve')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={requisitionAction.isPending}
                  onClick={() =>
                    requisitionAction.mutate({ id: row.id, action: 'reject' })
                  }
                >
                  <X className='mr-2 h-4 w-4 text-rose-600' />
                  {t('purchaseRequisitions.actions.reject', 'Reject')}
                </DropdownMenuItem>
              </>
            )}

            {isApproved && (
              <DropdownMenuItem
                disabled={requisitionAction.isPending}
                onClick={() => setConfirmConvert(true)}
              >
                <ArrowRightCircle className='mr-2 h-4 w-4 text-purple-600' />
                {t('purchaseRequisitions.actions.convertToPO', 'Convert to PO')}
              </DropdownMenuItem>
            )}

            {(isDraft || isSubmitted) && (
              <DropdownMenuItem
                className='text-amber-600 focus:text-amber-600'
                disabled={cancelRequisition.isPending}
                onClick={() => cancelRequisition.mutate(row.id)}
              >
                <XCircle className='mr-2 h-4 w-4' />
                {t('purchaseRequisitions.actions.cancel', 'Cancel Requisition')}
              </DropdownMenuItem>
            )}

            {(isDraft || isCancelled) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => {
                    setCurrentRow(row)
                    setOpen('delete')
                  }}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  {t('purchaseRequisitions.actions.delete', 'Delete')}
                </DropdownMenuItem>
              </>
            )}
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmConvert}
        onOpenChange={setConfirmConvert}
        title={t('purchaseRequisitions.actions.confirmConvertTitle', 'Convert to Purchase Order?')}
        desc={t(
          'purchaseRequisitions.actions.confirmConvertDesc',
          'A draft purchase order will be created from {{reqNumber}} and the requisition will be marked converted. This cannot be undone.',
          { reqNumber: row.requisition_number }
        )}
        confirmText={t('purchaseRequisitions.actions.convertToPO', 'Convert to PO')}
        cancelBtnText={t('common.cancel', 'Cancel')}
        isLoading={requisitionAction.isPending}
        handleConfirm={handleConvert}
      />
    </>
  )
}
