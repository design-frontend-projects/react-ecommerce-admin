import { useState } from 'react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import type { CountListItem } from '../data/schema'
import {
  useCancelCount,
  useCount,
  useCountAction,
} from '../hooks/use-stock-counts'
import { CountSheet } from './count-sheet'
import { VarianceReview } from './variance-review'

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
  const [activeTab, setActiveTab] = useState('sheet')

  const current = detail ?? count
  const status = current.status
  const isBlind = current.is_blind
  const items = detail?.stock_count_items ?? []

  const handleEntryChange = (itemId: string, val: string) => {
    setEntries((prev) => ({ ...prev, [itemId]: val }))
  }

  const handleSave = async () => {
    const collected = items
      .map((item) => ({
        itemId: item.id,
        value:
          entries[item.id] ??
          (item.qty_counted !== null ? String(item.qty_counted) : ''),
      }))
      .filter((entry) => entry.value !== '')
      .map((entry) => ({
        itemId: entry.itemId,
        qtyCounted: Number(entry.value),
      }))

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-3xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <div className='flex items-center justify-between gap-3 pr-6'>
              <div className='flex items-center gap-2'>
                <DialogTitle className='text-lg font-bold'>
                  Count: {count.count_number}
                </DialogTitle>
                {isBlind && <Badge variant='outline'>Blind Count</Badge>}
              </div>
              <StatusBadge status={status} />
            </div>
            <DialogDescription className='text-xs pt-1'>
              Store / Warehouse:{' '}
              <span className='font-semibold text-foreground'>
                {current.stores?.name ?? '—'}
              </span>{' '}
              ·{' '}
              {current.warehouse_location_id
                ? 'Specific Location'
                : 'Full Store / Facility'}
            </DialogDescription>
          </DialogHeader>

          {status === 'posted' && current.posted_adjustment_id && (
            <div className='p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300'>
              Variance posted into live ledger as Adjustment{' '}
              <strong className='font-mono'>
                #{current.posted_adjustment_id.slice(0, 8)}
              </strong>
              .
            </div>
          )}

          {isLoading ? (
            <p className='text-sm text-muted-foreground py-6 text-center'>
              Loading items...
            </p>
          ) : status === 'draft' ? (
            <div className='p-6 text-center border rounded-lg bg-muted/20 space-y-2'>
              <p className='text-sm font-semibold text-foreground'>
                Stock Count Ready to Start
              </p>
              <p className='text-xs text-muted-foreground max-w-md mx-auto'>
                Click "Start Counting" below to capture and freeze the snapshot of
                expected quantities for all products in this location.
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
              <TabsList className='grid w-full grid-cols-2 mb-2'>
                <TabsTrigger value='sheet' className='text-xs font-semibold'>
                  Counting Sheet ({items.length})
                </TabsTrigger>
                <TabsTrigger value='variance' className='text-xs font-semibold'>
                  Variance & Discrepancies
                </TabsTrigger>
              </TabsList>

              <TabsContent value='sheet' className='pt-1'>
                <CountSheet
                  items={items}
                  isBlind={isBlind}
                  isCounting={status === 'counting'}
                  entries={entries}
                  onEntryChange={handleEntryChange}
                  onSave={handleSave}
                  isSaving={countAction.isPending}
                />
              </TabsContent>

              <TabsContent value='variance' className='pt-1'>
                <VarianceReview items={items} />
              </TabsContent>
            </Tabs>
          )}

          {current.notes && (
            <div className='p-3 rounded-md bg-muted/30 text-xs space-y-1'>
              <span className='font-semibold text-foreground'>Notes:</span>
              <p className='text-muted-foreground'>{current.notes}</p>
            </div>
          )}

          <DialogFooter className='flex-row items-center justify-between sm:justify-between gap-2 pt-2 border-t'>
            {status === 'draft' ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelCount.isPending}
                >
                  Cancel Count
                </Button>
                <Button
                  size='sm'
                  onClick={() => void handleAction('snapshot')}
                  disabled={countAction.isPending}
                  className='bg-primary'
                >
                  {countAction.isPending ? 'Freezing Snapshot...' : 'Start Counting'}
                </Button>
              </Can>
            ) : status === 'counting' ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelCount.isPending}
                >
                  Cancel Count
                </Button>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => void handleSave()}
                    disabled={countAction.isPending}
                  >
                    Save Progress
                  </Button>
                  <Button
                    size='sm'
                    onClick={() => void handleAction('review')}
                    disabled={countAction.isPending}
                    className='bg-teal-600 hover:bg-teal-700 text-white'
                  >
                    Submit for Review
                  </Button>
                </div>
              </Can>
            ) : status === 'review' ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  size='sm'
                  onClick={() => setConfirmPost(true)}
                  disabled={countAction.isPending}
                  className='bg-emerald-600 hover:bg-emerald-700 text-white'
                >
                  Approve & Post Variance
                </Button>
              </Can>
            ) : (
              <Button
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title='Post this count variance?'
        desc='Stock variances will be officially posted to the stock ledger via an adjustment. This updates active inventory balances.'
        confirmText='Post Count'
        isLoading={countAction.isPending}
        handleConfirm={() => void handleAction('post')}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title='Cancel this count?'
        desc='The count will be marked cancelled. No stock changes are made.'
        confirmText='Cancel Count'
        isLoading={cancelCount.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
