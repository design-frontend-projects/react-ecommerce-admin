import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import { useCancelCount, useCount, useCountAction } from '../hooks/use-stock-counts'
import type { CountItemRow, CountListItem } from '../data/schema'

function varianceClass(variance: number): string {
  if (variance < 0) return 'text-end tabular-nums text-rose-600'
  if (variance > 0) return 'text-end tabular-nums text-emerald-600'
  return 'text-end tabular-nums text-muted-foreground'
}

export function CountViewDialog({
  count,
  open,
  onOpenChange,
}: {
  count: CountListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useCount(open ? count.id : undefined)
  const countAction = useCountAction()
  const cancelCount = useCancelCount()
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [confirmPost, setConfirmPost] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const current = detail ?? count
  const status = current.status
  const isBlind = current.is_blind
  const items = detail?.stock_count_items ?? []

  const entryValue = (item: CountItemRow): string =>
    entries[item.id] ??
    (item.qty_counted !== null ? String(item.qty_counted) : '')

  const collectEntries = () =>
    items
      .map((item) => ({ itemId: item.id, value: entryValue(item) }))
      .filter((entry) => entry.value !== '')
      .map((entry) => ({
        itemId: entry.itemId,
        qtyCounted: Number(entry.value),
      }))

  const handleSave = async () => {
    const collected = collectEntries()
    if (collected.length === 0) {
      toast.error('Enter at least one counted quantity.')
      return
    }
    try {
      await countAction.mutateAsync({
        id: count.id,
        action: 'save',
        entries: collected,
      })
      setEntries({})
    } catch {
      /* handled by mutation onError toast */
    }
  }

  const handleAction = async (action: 'snapshot' | 'review' | 'post') => {
    try {
      await countAction.mutateAsync({ id: count.id, action })
      setConfirmPost(false)
      if (action === 'post') {
        onOpenChange(false)
      }
    } catch {
      setConfirmPost(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelCount.mutateAsync(count.id)
      setConfirmCancel(false)
      onOpenChange(false)
    } catch {
      setConfirmCancel(false)
    }
  }

  const showSnapshot = !(status === 'counting' && isBlind)
  const showVariance = status === 'review' || status === 'posted'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              {count.count_number}
              <Badge
                variant={status === 'cancelled' ? 'destructive' : 'secondary'}
                className='capitalize'
              >
                {status}
              </Badge>
              {isBlind ? <Badge variant='outline'>Blind</Badge> : null}
            </DialogTitle>
            <DialogDescription>
              {current.stores?.name ?? '—'} ·{' '}
              {current.warehouse_location_id ? 'Location' : 'Store-wide'}
            </DialogDescription>
          </DialogHeader>

          {status === 'posted' && current.posted_adjustment_id ? (
            <p className='text-sm text-muted-foreground'>
              Posted as adjustment{' '}
              <span className='font-medium text-foreground'>
                {current.posted_adjustment_id.slice(0, 8)}
              </span>
              .
            </p>
          ) : null}

          {isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading items...</p>
          ) : status === 'draft' ? (
            <p className='text-sm text-muted-foreground'>
              No items yet. Starting the count freezes the expected quantities
              for the selected scope.
            </p>
          ) : (
            <ScrollArea className='max-h-[50vh]'>
              <div className='overflow-hidden rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      {showSnapshot ? (
                        <TableHead className='text-end'>Expected</TableHead>
                      ) : null}
                      <TableHead className='text-end'>Counted</TableHead>
                      {showVariance ? (
                        <TableHead className='text-end'>Variance</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const variance =
                        item.variance ??
                        (item.qty_counted !== null
                          ? item.qty_counted - item.qty_snapshot
                          : null)
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.product_variants?.sku ??
                              item.product_variant_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {item.product_variants?.products?.name ?? '—'}
                          </TableCell>
                          {showSnapshot ? (
                            <TableCell className='text-end tabular-nums'>
                              {item.qty_snapshot}
                            </TableCell>
                          ) : null}
                          <TableCell className='text-end'>
                            {status === 'counting' ? (
                              <Input
                                type='number'
                                step='any'
                                min='0'
                                value={entryValue(item)}
                                onChange={(event) =>
                                  setEntries((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                className='ms-auto h-8 w-24 text-end'
                              />
                            ) : (
                              <span className='tabular-nums'>
                                {item.qty_counted ?? '—'}
                              </span>
                            )}
                          </TableCell>
                          {showVariance ? (
                            <TableCell
                              className={
                                variance !== null
                                  ? varianceClass(variance)
                                  : 'text-end text-muted-foreground'
                              }
                            >
                              {variance !== null
                                ? `${variance > 0 ? '+' : ''}${variance}`
                                : '—'}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}

          {current.notes ? (
            <p className='text-sm text-muted-foreground'>{current.notes}</p>
          ) : null}

          <DialogFooter>
            {status === 'draft' ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelCount.isPending}
                >
                  Cancel count
                </Button>
                <Button
                  onClick={() => void handleAction('snapshot')}
                  disabled={countAction.isPending}
                >
                  {countAction.isPending ? 'Starting...' : 'Start counting'}
                </Button>
              </Can>
            ) : status === 'counting' ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelCount.isPending}
                >
                  Cancel count
                </Button>
                <Button
                  variant='outline'
                  onClick={() => void handleSave()}
                  disabled={countAction.isPending}
                >
                  Save counts
                </Button>
                <Button
                  onClick={() => void handleAction('review')}
                  disabled={countAction.isPending}
                >
                  Send to review
                </Button>
              </Can>
            ) : status === 'review' ? (
              <Can permission='inventory.manage'>
                <Button
                  onClick={() => setConfirmPost(true)}
                  disabled={countAction.isPending}
                >
                  Post count
                </Button>
              </Can>
            ) : (
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title='Post this count?'
        desc='Variances will be applied to stock through a stocktake adjustment. This cannot be undone.'
        confirmText='Post count'
        isLoading={countAction.isPending}
        handleConfirm={() => void handleAction('post')}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title='Cancel this count?'
        desc='The count will be marked cancelled. No stock changes are made.'
        confirmText='Cancel count'
        isLoading={cancelCount.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
