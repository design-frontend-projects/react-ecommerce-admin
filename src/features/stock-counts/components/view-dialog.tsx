import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      toast.error(t('stockCounts.viewDialog.enterAtLeastOne', 'Enter at least one counted quantity.'))
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
                  {t('stockCounts.viewDialog.count', 'Count: {{number}}', { number: count.count_number })}
                </DialogTitle>
                {isBlind && <Badge variant='outline'>{t('stockCounts.blindCount', 'Blind Count')}</Badge>}
              </div>
              <StatusBadge status={status} />
            </div>
            <DialogDescription className='text-xs pt-1'>
              {t('stockCounts.viewDialog.storeWarehouse', 'Store / Warehouse:')}{' '}
              <span className='font-semibold text-foreground'>
                {current.stores?.name ?? '—'}
              </span>{' '}
              ·{' '}
              {current.warehouse_location_id
                ? t('stockCounts.scopeSpecificLocation', 'Specific Location')
                : t('stockCounts.scopeFullFacility', 'Full Store / Facility')}
            </DialogDescription>
          </DialogHeader>

          {status === 'posted' && current.posted_adjustment_id && (
            <div className='p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300'>
              {t('stockCounts.viewDialog.variancePosted', 'Variance posted into live ledger as Adjustment')}{' '}
              <strong className='font-mono'>
                #{current.posted_adjustment_id.slice(0, 8)}
              </strong>
              .
            </div>
          )}

          {isLoading ? (
            <p className='text-sm text-muted-foreground py-6 text-center'>
              {t('stockCounts.viewDialog.loading', 'Loading items...')}
            </p>
          ) : status === 'draft' ? (
            <div className='p-6 text-center border rounded-lg bg-muted/20 space-y-2'>
              <p className='text-sm font-semibold text-foreground'>
                {t('stockCounts.viewDialog.readyTitle', 'Stock Count Ready to Start')}
              </p>
              <p className='text-xs text-muted-foreground max-w-md mx-auto'>
                {t(
                  'stockCounts.viewDialog.readyDesc',
                  'Click "Start Counting" below to capture and freeze the snapshot of expected quantities for all products in this location.'
                )}
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
              <TabsList className='grid w-full grid-cols-2 mb-2'>
                <TabsTrigger value='sheet' className='text-xs font-semibold'>
                  {t('stockCounts.viewDialog.tabs.countingSheet', 'Counting Sheet ({{count}})', {
                    count: items.length,
                  })}
                </TabsTrigger>
                <TabsTrigger value='variance' className='text-xs font-semibold'>
                  {t('stockCounts.viewDialog.tabs.variance', 'Variance & Discrepancies')}
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
              <span className='font-semibold text-foreground'>{t('stockCounts.viewDialog.notes', 'Notes:')}</span>
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
                  {t('stockCounts.viewDialog.cancelCount', 'Cancel Count')}
                </Button>
                <Button
                  size='sm'
                  onClick={() => void handleAction('snapshot')}
                  disabled={countAction.isPending}
                  className='bg-primary'
                >
                  {countAction.isPending
                    ? t('stockCounts.viewDialog.freezingSnapshot', 'Freezing Snapshot...')
                    : t('stockCounts.viewDialog.startCounting', 'Start Counting')}
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
                  {t('stockCounts.viewDialog.cancelCount', 'Cancel Count')}
                </Button>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => void handleSave()}
                    disabled={countAction.isPending}
                  >
                    {t('stockCounts.viewDialog.saveProgress', 'Save Progress')}
                  </Button>
                  <Button
                    size='sm'
                    onClick={() => void handleAction('review')}
                    disabled={countAction.isPending}
                    className='bg-teal-600 hover:bg-teal-700 text-white'
                  >
                    {t('stockCounts.viewDialog.submitReview', 'Submit for Review')}
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
                  {t('stockCounts.viewDialog.close', 'Close')}
                </Button>
                <Button
                  size='sm'
                  onClick={() => setConfirmPost(true)}
                  disabled={countAction.isPending}
                  className='bg-emerald-600 hover:bg-emerald-700 text-white'
                >
                  {t('stockCounts.viewDialog.approvePost', 'Approve & Post Variance')}
                </Button>
              </Can>
            ) : (
              <Button
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
              >
                {t('stockCounts.viewDialog.close', 'Close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title={t('stockCounts.viewDialog.postConfirm.title', 'Post this count variance?')}
        desc={t(
          'stockCounts.viewDialog.postConfirm.desc',
          'Stock variances will be officially posted to the stock ledger via an adjustment. This updates active inventory balances.'
        )}
        confirmText={t('stockCounts.viewDialog.postConfirm.confirm', 'Post Count')}
        isLoading={countAction.isPending}
        handleConfirm={() => void handleAction('post')}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title={t('stockCounts.viewDialog.cancelConfirm.title', 'Cancel this count?')}
        desc={t(
          'stockCounts.viewDialog.cancelConfirm.desc',
          'The count will be marked cancelled. No stock changes are made.'
        )}
        confirmText={t('stockCounts.viewDialog.cancelConfirm.confirm', 'Cancel Count')}
        isLoading={cancelCount.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
