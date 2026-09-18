import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBranches } from '@/features/branches/hooks/use-branches'
import { useBatchReceiveItems } from '../hooks/use-purchase-order-items'
import {
  usePurchaseOrder,
  useUpdatePurchaseOrderStatus,
  type PurchaseOrder,
} from '../hooks/use-purchase-orders'
import { usePOContext } from './po-provider'
import { POStatusBadge } from './po-status-badge'

const getItemKey = (
  item: { id?: string; po_item_id?: number | string },
  index: number
) => String(item.id || item.po_item_id || `idx_${index}`)

interface POReceiveDialogContentProps {
  currentRow: PurchaseOrder
  onClose: () => void
}

function POReceiveDialogContent({
  currentRow,
  onClose,
}: POReceiveDialogContentProps) {
  const { t } = useTranslation()
  const poId = currentRow.id || currentRow.po_id || 0
  const { data: po } = usePurchaseOrder(poId)
  const batchReceive = useBatchReceiveItems()
  const updateStatus = useUpdatePurchaseOrderStatus()
  const { data: branches } = useBranches()

  const [receivedQtys, setReceivedQtys] = useState<
    Record<string, number | string>
  >({})
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  const handleReceive = async () => {
    if (!po) return

    if (!selectedBranchId) {
      toast.error(t('purchaseOrders.receiveDialog.storeRequired', 'Store location is required to receive inventory.'))
      return
    }

    try {
      const items = (po.purchase_order_items || [])
        .map((item, index) => {
          const key = getItemKey(item, index)
          const receivedQty = Number(receivedQtys[key]) || 0
          return {
            po_item_id: item.id || item.po_item_id,
            item_id: item.id,
            variant_id: item.product_variant_id || '',
            qty_to_receive: receivedQty,
            unit_cost: item.unit_cost,
          }
        })
        .filter((item) => item.qty_to_receive > 0)

      if (items.length === 0) {
        toast.error(t('purchaseOrders.receiveDialog.noItemsToReceive', 'No items have a received quantity > 0.'))
        return
      }

      await batchReceive.mutateAsync({
        po_id: po.id || po.po_id,
        store_id: selectedBranchId,
        items,
      })

      // Determine new status
      const allReceived = po.purchase_order_items.every((item, index) => {
        const key = getItemKey(item, index)
        const prev = Number(item.received_quantity ?? 0)
        const now = Number(receivedQtys[key]) || 0
        return prev + now >= item.quantity_ordered
      })
      const someReceived = po.purchase_order_items.some((item, index) => {
        const key = getItemKey(item, index)
        const prev = Number(item.received_quantity ?? 0)
        const now = Number(receivedQtys[key]) || 0
        return prev + now > 0
      })

      let newStatus: 'received' | 'partial' | 'pending' = 'pending'
      if (allReceived) newStatus = 'received'
      else if (someReceived) newStatus = 'partial'

      if (newStatus !== po.status) {
        await updateStatus.mutateAsync({
          id: po.id || po.po_id,
          status: newStatus,
        })
      }

      toast.success(
        allReceived
          ? t('purchaseOrders.receiveDialog.allReceivedSuccess', 'All items received — order complete!')
          : t('purchaseOrders.receiveDialog.partialReceivedSuccess', 'Items partially received')
      )
      onClose()
    } catch (error: unknown) {
      toast.error(t('common.error', 'Error'), {
        description: (error as Error)?.message || t('purchaseOrders.receiveDialog.failedToReceive', 'Failed to receive items.'),
      })
    }
  }

  const handleReceiveAll = () => {
    if (!po?.purchase_order_items) return
    const allQtys: Record<string, number> = {}
    po.purchase_order_items.forEach((item, index) => {
      const key = getItemKey(item, index)
      const prevReceived = Number(item.received_quantity ?? 0)
      const remaining = Math.max(0, item.quantity_ordered - prevReceived)
      if (remaining > 0) {
        allQtys[key] = remaining
      }
    })
    setReceivedQtys(allQtys)
  }

  const poLabel = `PO-${String(currentRow.po_id).padStart(4, '0')}`
  const isPending = batchReceive.isPending || updateStatus.isPending

  return (
    <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
      <DialogHeader>
        <div className='flex items-center justify-between'>
          <DialogTitle className='flex items-center gap-2'>
            {t('purchaseOrders.receiveDialog.title', 'Receive Items')} — {poLabel}
            <POStatusBadge status={currentRow.status} />
          </DialogTitle>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleReceiveAll}
            className='text-xs h-8 mr-6 text-primary hover:text-primary'
          >
            {t('purchaseOrders.receiveDialog.receiveAllRemaining', 'Fill Remaining Qty')}
          </Button>
        </div>
        <DialogDescription>
          {t('purchaseOrders.receiveDialog.desc', 'Enter the quantity received for each item.')}
          {currentRow.suppliers?.name && (
            <>
              {' '}
              {t('purchaseOrders.columns.supplier', 'Supplier')}: <strong>{currentRow.suppliers.name}</strong>
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className='mb-4'>
        <Label className='mb-2 block'>
          {t('purchaseOrders.receiveDialog.receiveToStore', 'Receive To Store / Branch')} <span className='text-red-500'>*</span>
        </Label>
        <select
          className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
        >
          <option value='' disabled>
            {t('purchaseOrders.receiveDialog.selectBranch', 'Select a branch...')}
          </option>
          {branches?.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {po?.purchase_order_items && po.purchase_order_items.length > 0 ? (
        <div className='rounded-md border overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('purchaseOrders.receiveDialog.product', 'Product')}</TableHead>
                <TableHead className='w-20 text-center'>{t('purchaseOrders.receiveDialog.uom', 'UOM')}</TableHead>
                <TableHead className='text-right'>{t('purchaseOrders.receiveDialog.ordered', 'Ordered')}</TableHead>
                <TableHead className='text-right'>
                  {t('purchaseOrders.receiveDialog.previouslyReceived', 'Previously Received')}
                </TableHead>
                <TableHead className='text-right'>{t('purchaseOrders.receiveDialog.receiveNow', 'Receive Now')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.purchase_order_items.map((item, index) => {
                const key = getItemKey(item, index)
                const prevReceived = Number(item.received_quantity ?? 0)
                const remainingToReceive = Math.max(
                  0,
                  item.quantity_ordered - prevReceived
                )

                return (
                  <TableRow key={key}>
                    <TableCell className='font-medium'>
                      <div className='flex flex-col gap-1'>
                        <span>
                          {item.products?.name || `Product #${item.product_id}`}
                        </span>
                        {item.product_variant_id && (
                          <span className='text-xs text-muted-foreground'>
                            {item.products?.product_variants?.find(
                              (v) => v.id === item.product_variant_id
                            )?.sku ||
                              `Variant ID: ${item.product_variant_id.split('-')[0]}...`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-center'>
                      {item.uoms?.code ||
                      item.uoms?.name ||
                      (item.products as { base_uom?: { code?: string } })
                        ?.base_uom?.code ? (
                        <span className='inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground'>
                          {item.uoms?.code ||
                            item.uoms?.name ||
                            (item.products as { base_uom?: { code?: string } })
                              ?.base_uom?.code}
                        </span>
                      ) : (
                        <span className='text-xs text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className='text-right text-muted-foreground'>
                      {prevReceived}
                    </TableCell>
                    <TableCell className='text-right'>
                      {remainingToReceive <= 0 ? (
                        <span className='inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-500'>
                          {t('purchaseOrders.receiveDialog.fulfilled', 'Fulfilled')}
                        </span>
                      ) : (
                        <Input
                          type='number'
                          min={0}
                          max={remainingToReceive}
                          className='ml-auto w-24 text-right font-semibold'
                          placeholder='0'
                          value={receivedQtys[key] ?? ''}
                          onChange={(e) => {
                            const rawVal = e.target.value
                            if (rawVal === '') {
                              setReceivedQtys((prev) => ({
                                ...prev,
                                [key]: '',
                              }))
                              return
                            }
                            const num = Number(rawVal)
                            if (isNaN(num)) return
                            const clamped = Math.min(
                              remainingToReceive,
                              Math.max(0, num)
                            )
                            setReceivedQtys((prev) => ({
                              ...prev,
                              [key]: clamped,
                            }))
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className='py-8 text-center'>
          <Label className='text-muted-foreground'>
            {t('purchaseOrders.receiveDialog.noItemsFound', 'No items found for this order.')}
          </Label>
        </div>
      )}

      <DialogFooter>
        <Button variant='outline' onClick={onClose} disabled={isPending}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button onClick={handleReceive} disabled={isPending}>
          {isPending ? t('common.processing', 'Processing...') : t('purchaseOrders.receiveDialog.confirmReceive', 'Confirm Receive')}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function POReceiveDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const isOpen = open === 'receive'

  if (!currentRow) return null

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      {isOpen && (
        <POReceiveDialogContent
          key={String(currentRow.id || currentRow.po_id)}
          currentRow={currentRow}
          onClose={() => setOpen(null)}
        />
      )}
    </Dialog>
  )
}
