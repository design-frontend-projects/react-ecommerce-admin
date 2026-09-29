import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightCircle,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  MoreHorizontal,
  Package,
  Pencil,
  Truck,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import type { TransferListItem } from '../data/schema'
import { useTransfersContext } from './provider'
import {
  useApproveTransfer,
  useCancelTransfer,
  usePickTransfer,
  useReceiveTransfer,
  useShipTransfer,
  useSubmitTransfer,
} from '../hooks/use-stock-transfers'

export function TransferRowActions({ row }: { row: TransferListItem }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setCurrentRow, setOpen } = useTransfersContext()

  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  const submitTransfer = useSubmitTransfer()
  const approveTransfer = useApproveTransfer()
  const pickTransfer = usePickTransfer()
  const shipTransfer = useShipTransfer()
  const receiveTransfer = useReceiveTransfer()
  const cancelTransfer = useCancelTransfer()

  const isPending =
    submitTransfer.isPending ||
    approveTransfer.isPending ||
    pickTransfer.isPending ||
    shipTransfer.isPending ||
    receiveTransfer.isPending ||
    cancelTransfer.isPending

  const isDraft = row.status === 'draft'
  const isPendingApproval = row.status === 'pending_approval'
  const isApproved = row.status === 'approved'
  const isReadyOrPicked = row.status === 'ready_to_ship' || row.status === 'picked'
  const isShipped =
    row.status === 'shipped' ||
    row.status === 'partially_shipped' ||
    row.status === 'in_transit'
  const canCancel = [
    'draft',
    'pending_approval',
    'approved',
    'ready_to_ship',
    'picked',
  ].includes(row.status)

  const handleExecuteAction = async () => {
    try {
      if (confirmAction === 'submit') {
        await submitTransfer.mutateAsync(row.id)
      } else if (confirmAction === 'approve') {
        await approveTransfer.mutateAsync(row.id)
      } else if (confirmAction === 'pick') {
        await pickTransfer.mutateAsync(row.id)
      } else if (confirmAction === 'ship') {
        await shipTransfer.mutateAsync(row.id)
      } else if (confirmAction === 'receive') {
        await receiveTransfer.mutateAsync(row.id)
      } else if (confirmAction === 'cancel') {
        await cancelTransfer.mutateAsync(row.id)
      }
      setConfirmAction(null)
    } catch {
      setConfirmAction(null)
    }
  }

  return (
    <div className='flex items-center justify-end gap-1'>
      {/* Quick View Button */}
      <Button
        variant='ghost'
        size='sm'
        className='h-8 px-2 text-xs font-medium'
        onClick={() => {
          setCurrentRow(row)
          setOpen('view')
        }}
      >
        <Eye className='mr-1.5 h-3.5 w-3.5 text-muted-foreground' />
        {t('common.view', 'View')}
      </Button>

      {/* Overflow Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-muted-foreground hover:text-foreground'
          >
            <MoreHorizontal className='h-4 w-4' />
            <span className='sr-only'>Open transfer actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48 text-xs'>
          <DropdownMenuLabel className='text-[10px] uppercase font-semibold text-muted-foreground tracking-wider'>
            Transfer Actions
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() =>
              navigate({
                to: '/stock-transfers/$transferId',
                params: { transferId: row.id },
              })
            }
          >
            <ExternalLink className='mr-2 h-3.5 w-3.5 text-primary' />
            <span>Open Full Page</span>
          </DropdownMenuItem>

          {isDraft && (
            <Can permission='inventory.stock.manage'>
              <DropdownMenuItem
                onClick={() => {
                  setCurrentRow(row)
                  setOpen('edit')
                }}
              >
                <Pencil className='mr-2 h-3.5 w-3.5 text-blue-500' />
                <span>Edit Transfer</span>
              </DropdownMenuItem>
            </Can>
          )}

          <DropdownMenuSeparator />

          {/* Workflow Stage Transitions */}
          {isDraft && (
            <>
              <Can permission='inventory.stock.manage'>
                <DropdownMenuItem onClick={() => setConfirmAction('submit')}>
                  <Clock className='mr-2 h-3.5 w-3.5 text-amber-500' />
                  <span>Submit for Approval</span>
                </DropdownMenuItem>
              </Can>
              <Can permission='inventory.stock.manage'>
                <DropdownMenuItem onClick={() => setConfirmAction('approve')}>
                  <Check className='mr-2 h-3.5 w-3.5 text-emerald-600' />
                  <span>Approve Directly</span>
                </DropdownMenuItem>
              </Can>
            </>
          )}

          {isPendingApproval && (
            <Can permission='inventory.stock.manage'>
              <DropdownMenuItem onClick={() => setConfirmAction('approve')}>
                <CheckCircle2 className='mr-2 h-3.5 w-3.5 text-emerald-600' />
                <span>Approve Transfer</span>
              </DropdownMenuItem>
            </Can>
          )}

          {isApproved && (
            <Can permission='inventory.stock.manage'>
              <DropdownMenuItem onClick={() => setConfirmAction('pick')}>
                <Package className='mr-2 h-3.5 w-3.5 text-cyan-600' />
                <span>Mark Items Picked</span>
              </DropdownMenuItem>
            </Can>
          )}

          {(isApproved || isReadyOrPicked) && (
            <Can permission='inventory.stock.manage'>
              <DropdownMenuItem onClick={() => setConfirmAction('ship')}>
                <Truck className='mr-2 h-3.5 w-3.5 text-orange-500' />
                <span>Dispatch / Ship</span>
              </DropdownMenuItem>
            </Can>
          )}

          {isShipped && (
            <Can permission='inventory.stock.manage'>
              <DropdownMenuItem onClick={() => setConfirmAction('receive')}>
                <ArrowRightCircle className='mr-2 h-3.5 w-3.5 text-emerald-600' />
                <span>Receive & Post Stock</span>
              </DropdownMenuItem>
            </Can>
          )}

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <Can permission='inventory.stock.manage'>
                <DropdownMenuItem
                  onClick={() => setConfirmAction('cancel')}
                  className='text-destructive focus:bg-destructive/10 focus:text-destructive'
                >
                  <X className='mr-2 h-3.5 w-3.5' />
                  <span>Cancel Transfer</span>
                </DropdownMenuItem>
              </Can>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        destructive={confirmAction === 'cancel'}
        title={
          confirmAction === 'cancel'
            ? 'Cancel Stock Transfer?'
            : confirmAction === 'submit'
              ? 'Submit for Approval?'
              : confirmAction === 'approve'
                ? 'Approve Stock Transfer?'
                : confirmAction === 'pick'
                  ? 'Mark Items as Picked?'
                  : confirmAction === 'ship'
                    ? 'Ship Transfer?'
                    : confirmAction === 'receive'
                      ? 'Receive & Post Stock?'
                      : 'Confirm Action'
        }
        desc={
          confirmAction === 'cancel'
            ? `Cancel transfer ${row.reference_no || row.id.slice(0, 8)}? No stock will be moved.`
            : `Proceed with ${confirmAction} for transfer ${row.reference_no || row.id.slice(0, 8)}?`
        }
        confirmText={
          confirmAction === 'cancel'
            ? 'Yes, Cancel'
            : confirmAction === 'submit'
              ? 'Submit'
              : confirmAction === 'approve'
                ? 'Approve'
                : confirmAction === 'pick'
                  ? 'Mark Picked'
                  : confirmAction === 'ship'
                    ? 'Dispatch'
                    : confirmAction === 'receive'
                      ? 'Receive & Post'
                      : 'Confirm'
        }
        isLoading={isPending}
        handleConfirm={handleExecuteAction}
      />
    </div>
  )
}
