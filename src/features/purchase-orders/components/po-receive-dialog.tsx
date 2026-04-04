import { useState, useEffect } from 'react'
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
import { useBatchReceiveItems } from '../hooks/use-purchase-order-items'
import {
  usePurchaseOrder,
  useUpdatePurchaseOrderStatus,
} from '../hooks/use-purchase-orders'
import { useBranches } from '@/features/branches/hooks/use-branches'
import { usePOContext } from './po-provider'
import { POStatusBadge } from './po-status-badge'

export function POReceiveDialog() {
  const { open, setOpen, currentRow } = usePOContext()
  const isOpen = open === 'receive'
  const poId = currentRow?.po_id ?? 0
  const { data: po } = usePurchaseOrder(poId)
  const batchReceive = useBatchReceiveItems()
  const updateStatus = useUpdatePurchaseOrderStatus()
  const { data: branches } = useBranches()

  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({})
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  // Initialize received quantities from existing data
  useEffect(() => {
    if (po?.purchase_order_items) {
      const initial: Record<number, number> = {}
      for (const item of po.purchase_order_items) {
        initial[item.po_item_id] = item.received_quantity || 0
      }
      setReceivedQtys(initial)
    }
  }, [po])

  const handleReceive = async () => {
    if (!po) return

    if (!selectedBranchId) {
      toast.error('Store location is required to receive inventory.')
      return
    }

    try {
      const items = po.purchase_order_items.map((item) => {
        const receivedQty = receivedQtys[item.po_item_id] ?? 0
        return {
          po_item_id: item.po_item_id,
          variant_id: item.product_variant_id || '', // Must match the RPC requirements
          qty_to_receive: receivedQty,
          unit_cost: item.unit_cost,
        }
      }).filter(item => item.qty_to_receive > 0)

      if (items.length === 0) {
        toast.error('No items have a received quantity > 0.')
        return
      }

      await batchReceive.mutateAsync({ po_id: po.po_id, store_id: selectedBranchId, items })

      // Determine new status
      const allReceived = po.purchase_order_items.every(
        (item) => (receivedQtys[item.po_item_id] ?? 0) >= item.quantity_ordered
      )
      const someReceived = po.purchase_order_items.some(
        (item) => (receivedQtys[item.po_item_id] ?? 0) > 0
      )

      let newStatus: 'received' | 'partial' | 'pending' = 'pending'
      if (allReceived) newStatus = 'received'
      else if (someReceived) newStatus = 'partial'

      if (newStatus !== po.status) {
        await updateStatus.mutateAsync({
          id: po.po_id,
          status: newStatus,
        })
      }

      toast.success(
        allReceived
          ? 'All items received — order complete!'
          : 'Items partially received'
      )
      setOpen(null)
    } catch (error: unknown) {
      toast.error('Error', {
        description: (error as Error)?.message || 'Failed to receive items.',
      })
    }
  }

  if (!currentRow) return null

  const poLabel = `PO-${String(currentRow.po_id).padStart(4, '0')}`
  const isPending = batchReceive.isPending || updateStatus.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            Receive Items — {poLabel}
            <POStatusBadge status={currentRow.status} />
          </DialogTitle>
          <DialogDescription>
            Enter the quantity received for each item.
            {currentRow.suppliers?.name && (
              <>
                {' '}
                Supplier: <strong>{currentRow.suppliers.name}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='mb-4'>
          <Label className='mb-2 block'>Receive To Store / Branch <span className='text-red-500'>*</span></Label>
          <select
            className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value='' disabled>Select a branch...</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {po?.purchase_order_items && po.purchase_order_items.length > 0 ? (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className='text-right'>Ordered</TableHead>
                  <TableHead className='text-right'>
                    Previously Received
                  </TableHead>
                  <TableHead className='text-right'>Receive Now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.purchase_order_items.map((item) => (
                  <TableRow key={item.po_item_id}>
                    <TableCell className='font-medium'>
                      <div className='flex flex-col gap-1'>
                        <span>{item.products?.name || `Product #${item.product_id}`}</span>
                        {item.product_variant_id && (
                          <span className='text-xs text-muted-foreground'>
                            {item.products?.product_variants?.find(v => v.id === item.product_variant_id)?.sku || `Variant ID: ${item.product_variant_id.split('-')[0]}...`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.received_quantity || 0}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Input
                        type='number'
                        min={0}
                        max={item.quantity_ordered}
                        className='ml-auto w-24 text-right'
                        value={receivedQtys[item.po_item_id] ?? 0}
                        onChange={(e) =>
                          setReceivedQtys((prev) => ({
                            ...prev,
                            [item.po_item_id]: Number(e.target.value),
                          }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className='py-8 text-center'>
            <Label className='text-muted-foreground'>
              No items found for this order.
            </Label>
          </div>
        )}

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => setOpen(null)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleReceive} disabled={isPending}>
            {isPending ? 'Processing...' : 'Confirm Receive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
