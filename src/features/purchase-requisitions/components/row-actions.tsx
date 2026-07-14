import { useState } from 'react'
import {
  ArrowRightCircle,
  Check,
  Eye,
  MoreHorizontal,
  Send,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const { setCurrentRow, setOpen } = useRequisitionsContext()
  const requisitionAction = useRequisitionAction()
  const cancelRequisition = useCancelRequisition()
  const [confirmConvert, setConfirmConvert] = useState(false)

  const isDraft = row.status === 'draft'
  const isSubmitted = row.status === 'submitted'
  const isApproved = row.status === 'approved'

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
          <Button variant='ghost' size='icon'>
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
            <Eye className='me-2 h-4 w-4' />
            View
          </DropdownMenuItem>
          <Can permission='purchasing.manage'>
            {isDraft ? (
              <DropdownMenuItem
                disabled={requisitionAction.isPending}
                onClick={() =>
                  requisitionAction.mutate({ id: row.id, action: 'submit' })
                }
              >
                <Send className='me-2 h-4 w-4' />
                Submit
              </DropdownMenuItem>
            ) : null}
            {isSubmitted ? (
              <>
                <DropdownMenuItem
                  disabled={requisitionAction.isPending}
                  onClick={() =>
                    requisitionAction.mutate({ id: row.id, action: 'approve' })
                  }
                >
                  <Check className='me-2 h-4 w-4' />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={requisitionAction.isPending}
                  onClick={() =>
                    requisitionAction.mutate({ id: row.id, action: 'reject' })
                  }
                >
                  <X className='me-2 h-4 w-4' />
                  Reject
                </DropdownMenuItem>
              </>
            ) : null}
            {isApproved ? (
              <DropdownMenuItem
                disabled={requisitionAction.isPending}
                onClick={() => setConfirmConvert(true)}
              >
                <ArrowRightCircle className='me-2 h-4 w-4' />
                Convert to PO
              </DropdownMenuItem>
            ) : null}
            {isDraft || isSubmitted ? (
              <DropdownMenuItem
                className='text-rose-600'
                disabled={cancelRequisition.isPending}
                onClick={() => cancelRequisition.mutate(row.id)}
              >
                <XCircle className='me-2 h-4 w-4' />
                Cancel
              </DropdownMenuItem>
            ) : null}
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmConvert}
        onOpenChange={setConfirmConvert}
        title='Convert to purchase order?'
        desc={`A purchase order will be created from ${row.requisition_number} and the requisition will be marked converted. This cannot be undone.`}
        confirmText='Convert'
        cancelBtnText='Cancel'
        isLoading={requisitionAction.isPending}
        handleConfirm={handleConvert}
      />
    </>
  )
}
