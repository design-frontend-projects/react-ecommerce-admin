import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Calendar,
  Warehouse,
  FolderTree,
  EyeOff,
  Clock,
  CheckCircle2,
  FileCheck2,
  PlayCircle,
  Hash,
} from 'lucide-react'
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

  const facilityName =
    current.warehouses?.name ??
    current.stores?.name ??
    (current.warehouse_id ? current.warehouse_id.slice(0, 8) : '—')

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
        <DialogContent className='max-h-[92vh] sm:max-w-4xl overflow-y-auto p-4 sm:p-6'>
          <DialogHeader className='pb-2 border-b'>
            <div className='flex flex-wrap items-center justify-between gap-3 pr-6'>
              <div className='flex items-center gap-2.5'>
                <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                  <Hash className='h-5 w-5' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <DialogTitle className='text-xl font-bold font-mono'>
                      {count.count_number}
                    </DialogTitle>
                    {isBlind && (
                      <Badge variant='outline' className='text-[11px] flex items-center gap-1 text-amber-600 border-amber-500/30 bg-amber-500/5'>
                        <EyeOff className='h-3 w-3' />
                        {t('stockCounts.blindCount', 'Blind Count')}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className='text-xs pt-0.5 flex flex-wrap items-center gap-2'>
                    <span className='inline-flex items-center gap-1 font-medium text-foreground'>
                      <Warehouse className='h-3.5 w-3.5 text-muted-foreground' />
                      {facilityName}
                    </span>
                    <span>•</span>
                    <span className='inline-flex items-center gap-1 text-muted-foreground'>
                      <Calendar className='h-3.5 w-3.5' />
                      {new Date(current.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {current.categories?.name && (
                      <>
                        <span>•</span>
                        <span className='inline-flex items-center gap-1 text-primary font-medium'>
                          <FolderTree className='h-3.5 w-3.5' />
                          {current.categories.name}
                        </span>
                      </>
                    )}
                  </DialogDescription>
                </div>
              </div>
              <StatusBadge status={status} />
            </div>
          </DialogHeader>

          {/* Posted notification banner */}
          {status === 'posted' && current.posted_adjustment_id && (
            <div className='p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0' />
              <div>
                <span>{t('stockCounts.viewDialog.variancePosted', 'Stocktake variances posted to live inventory balance as Adjustment')}{' '}</span>
                <strong className='font-mono underline'>
                  #{current.posted_adjustment_id.slice(0, 8)}
                </strong>
                .
              </div>
            </div>
          )}

          {isLoading ? (
            <div className='py-12 text-center text-sm text-muted-foreground space-y-2'>
              <Clock className='h-6 w-6 animate-spin mx-auto text-primary' />
              <p>{t('stockCounts.viewDialog.loading', 'Loading stock count details...')}</p>
            </div>
          ) : status === 'draft' ? (
            <div className='rounded-xl border bg-muted/20 p-8 text-center space-y-3'>
              <div className='rounded-full bg-primary/10 p-3 w-fit mx-auto text-primary'>
                <PlayCircle className='h-8 w-8' />
              </div>
              <div className='max-w-md mx-auto space-y-1.5'>
                <h3 className='text-base font-bold text-foreground'>
                  {t('stockCounts.viewDialog.readyTitle', 'Audit Ready to Start')}
                </h3>
                <p className='text-xs text-muted-foreground'>
                  {t(
                    'stockCounts.viewDialog.readyDesc',
                    'Click "Start Counting" below to capture and freeze the snapshot of expected stock on hand for all matching items in this facility.'
                  )}
                </p>
              </div>

              {current.notes && (
                <div className='p-2.5 rounded-lg bg-background border max-w-md mx-auto text-xs text-left'>
                  <span className='font-semibold text-muted-foreground block mb-0.5'>
                    {t('stockCounts.viewDialog.notes', 'Auditor Notes:')}
                  </span>
                  <p className='text-foreground'>{current.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
              <TabsList className='grid w-full grid-cols-2 mb-3'>
                <TabsTrigger value='sheet' className='text-xs font-semibold py-1.5'>
                  {t('stockCounts.viewDialog.tabs.countingSheet', 'Counting Sheet')} ({items.length})
                </TabsTrigger>
                <TabsTrigger value='variance' className='text-xs font-semibold py-1.5'>
                  {t('stockCounts.viewDialog.tabs.variance', 'Variance Analysis')}
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

          {current.notes && status !== 'draft' && (
            <div className='p-3 rounded-lg bg-muted/20 border text-xs space-y-1'>
              <span className='font-semibold text-muted-foreground'>{t('stockCounts.viewDialog.notes', 'Notes:')}</span>
              <p className='text-foreground'>{current.notes}</p>
            </div>
          )}

          {/* Action Footer */}
          <DialogFooter className='flex-row items-center justify-between sm:justify-between gap-2 pt-3 border-t'>
            {status === 'draft' ? (
              <Can permission='inventory.manage'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelCount.isPending}
                >
                  {t('stockCounts.viewDialog.cancelCount', 'Cancel Audit')}
                </Button>
                <Button
                  size='sm'
                  onClick={() => void handleAction('snapshot')}
                  disabled={countAction.isPending}
                  className='bg-primary px-4'
                >
                  <PlayCircle className='h-4 w-4 mr-1.5' />
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
                  className='text-muted-foreground hover:text-destructive'
                >
                  {t('stockCounts.viewDialog.cancelCount', 'Cancel Audit')}
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
                    className='bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                  >
                    <FileCheck2 className='h-4 w-4 mr-1.5' />
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
                  className='bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-4'
                >
                  <CheckCircle2 className='h-4 w-4 mr-1.5' />
                  {t('stockCounts.viewDialog.approvePost', 'Approve & Post Variance')}
                </Button>
              </Can>
            ) : (
              <Button
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
                className='ml-auto'
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
        title={t('stockCounts.viewDialog.postConfirm.title', 'Post stock count variance?')}
        desc={t(
          'stockCounts.viewDialog.postConfirm.desc',
          'Stock variances will be officially posted to the stock ledger via an adjustment. This will permanently update current inventory balances.'
        )}
        confirmText={t('stockCounts.viewDialog.postConfirm.confirm', 'Approve & Post')}
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
          'The count will be marked cancelled. No stock balances will be modified.'
        )}
        confirmText={t('stockCounts.viewDialog.cancelConfirm.confirm', 'Cancel Audit')}
        isLoading={cancelCount.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
