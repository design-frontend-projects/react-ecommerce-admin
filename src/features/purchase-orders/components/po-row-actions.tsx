import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  PackageCheck,
  Ban,
  CheckCircle,
  Send,
  Lock,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import {
  type PurchaseOrder,
  useUpdatePurchaseOrderStatus,
} from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'

interface PORowActionsProps {
  row: PurchaseOrder
}

export function PORowActions({ row }: PORowActionsProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = usePOContext()
  const updateStatusMutation = useUpdatePurchaseOrderStatus()

  const poId = row.id || row.po_id
  const currentStatus = String(row.lifecycle_status ?? row.status).toLowerCase()

  const isDraft = currentStatus === 'draft'
  const isApproved = currentStatus === 'approved'
  const isSent = currentStatus === 'sent'
  const isPending = currentStatus === 'pending'
  const isPartial =
    currentStatus === 'partial' || currentStatus === 'partially_received'
  const isReceived = currentStatus === 'received'
  const isClosed = currentStatus === 'closed'
  const isCancelled = currentStatus === 'cancelled'

  const canReceive = isPending || isApproved || isSent || isPartial
  const canEdit = isDraft || isPending
  const canCancel = !isCancelled && !isClosed && !isReceived
  const canDelete = isDraft || isCancelled

  const handleQuickStatusChange = async (
    newStatus: 'approved' | 'sent' | 'closed'
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: poId,
        status: newStatus,
      })
      toast.success(
        t('purchaseOrders.actions.statusUpdated', 'Order status updated to {{status}}', {
          status: newStatus,
        })
      )
    } catch (error: unknown) {
      toast.error(t('common.error', 'Error'), {
        description:
          (error as Error)?.message ||
          t('purchaseOrders.actions.statusUpdateFailed', 'Failed to update order status.'),
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'>
          <span className='sr-only'>{t('common.openMenu', 'Open menu')}</span>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {/* 1. View Summary */}
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row)
            setOpen('view')
          }}
        >
          <Eye className='mr-2 h-4 w-4 text-primary' />
          {t('purchaseOrders.actions.viewSummary', 'View Summary')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 2. Lifecycle Status Transitions */}
        {isDraft && (
          <Can permission='purchasing.manage'>
            <DropdownMenuItem
              onClick={() => handleQuickStatusChange('approved')}
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle className='mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400' />
              {t('purchaseOrders.actions.approveOrder', 'Approve Order')}
            </DropdownMenuItem>
          </Can>
        )}

        {(isApproved || isPending) && (
          <Can permission='purchasing.manage'>
            <DropdownMenuItem
              onClick={() => handleQuickStatusChange('sent')}
              disabled={updateStatusMutation.isPending}
            >
              <Send className='mr-2 h-4 w-4 text-blue-600 dark:text-blue-400' />
              {t('purchaseOrders.actions.markSent', 'Mark as Sent')}
            </DropdownMenuItem>
          </Can>
        )}

        {/* 3. Receive Items */}
        {canReceive && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row)
              setOpen('receive')
            }}
          >
            <PackageCheck className='mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400' />
            {t('purchaseOrders.actions.receiveItems', 'Receive Items')}
          </DropdownMenuItem>
        )}

        {isReceived && (
          <Can permission='purchasing.manage'>
            <DropdownMenuItem
              onClick={() => handleQuickStatusChange('closed')}
              disabled={updateStatusMutation.isPending}
            >
              <Lock className='mr-2 h-4 w-4 text-purple-600 dark:text-purple-400' />
              {t('purchaseOrders.actions.closeOrder', 'Close Order')}
            </DropdownMenuItem>
          </Can>
        )}

        {/* 4. Edit Order */}
        {canEdit && (
          <Can permission='purchasing.manage'>
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(row)
                setOpen('edit')
              }}
            >
              <Pencil className='mr-2 h-4 w-4 text-amber-600 dark:text-amber-400' />
              {t('common.edit', 'Edit')}
            </DropdownMenuItem>
          </Can>
        )}

        {/* 5. Cancel Order */}
        {canCancel && (
          <Can permission='purchasing.manage'>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(row)
                setOpen('cancel')
              }}
              className='text-amber-600 focus:text-amber-600'
            >
              <Ban className='mr-2 h-4 w-4' />
              {t('purchaseOrders.actions.cancelOrder', 'Cancel Order')}
            </DropdownMenuItem>
          </Can>
        )}

        {/* 6. Delete Order */}
        {canDelete && (
          <Can permission='purchasing.manage'>
            {!canCancel && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(row)
                setOpen('delete')
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {t('common.delete', 'Delete')}
            </DropdownMenuItem>
          </Can>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
