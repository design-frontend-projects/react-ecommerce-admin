import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ArrowRight, CheckCircle2, XCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import { useInventoryTransaction, usePostInventoryTransaction } from '../hooks/use-inventory-transactions'

interface TransactionDetailDialogProps {
  transactionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReverseClick: (transactionId: string) => void
  onCancelClick: (transactionId: string) => void
}

export function TransactionDetailDialog({
  transactionId,
  open,
  onOpenChange,
  onReverseClick,
  onCancelClick,
}: TransactionDetailDialogProps) {
  const { t } = useTranslation()
  const { data: transaction, isLoading } = useInventoryTransaction(transactionId ?? undefined)
  const postMutation = usePostInventoryTransaction()

  if (!open) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'>{t('inventoryTransactions.status.posted')}</Badge>
      case 'draft':
        return <Badge variant='outline' className='text-amber-600 border-amber-500/30'>{t('inventoryTransactions.status.draft')}</Badge>
      case 'pending':
        return <Badge variant='secondary'>{t('inventoryTransactions.status.pendingApproval')}</Badge>
      case 'cancelled':
        return <Badge variant='destructive'>{t('inventoryTransactions.status.cancelled')}</Badge>
      case 'reversed':
        return <Badge className='bg-purple-500/15 text-purple-600 border-purple-500/30'>{t('inventoryTransactions.status.reversed')}</Badge>
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case 'inbound':
        return <span className='text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400'>{t('inventoryTransactions.direction.inbound')}</span>
      case 'outbound':
        return <span className='text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400'>{t('inventoryTransactions.direction.outbound')}</span>
      case 'internal':
        return <span className='text-xs px-2 py-0.5 rounded-full font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400'>{t('inventoryTransactions.direction.internal')}</span>
      default:
        return <span className='text-xs px-2 py-0.5 rounded-full font-medium bg-slate-500/10 text-slate-600'>{t('inventoryTransactions.direction.neutral')}</span>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-2'>
              <DialogTitle className='font-mono text-xl font-bold'>
                {transaction?.transaction_number ?? t('inventoryTransactions.detailDialog.transactionDetails')}
              </DialogTitle>
              {transaction && getStatusBadge(transaction.status)}
              {transaction && getDirectionBadge(transaction.direction)}
            </div>
          </div>
        </DialogHeader>

        {isLoading || !transaction ? (
          <div className='flex items-center justify-center p-12'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : (
          <div className='space-y-6 pt-2'>
            {/* Header info cards */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40 border'>
              <div>
                <p className='text-xs text-muted-foreground'>{t('inventoryTransactions.detailDialog.transactionType')}</p>
                <p className='font-semibold text-sm'>{transaction.transaction_type.name}</p>
                <p className='text-xs font-mono text-muted-foreground'>{transaction.transaction_type.code}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{t('inventoryTransactions.detailDialog.totalQuantity')}</p>
                <p className='font-semibold text-base font-mono'>{Number(transaction.total_qty).toLocaleString()}</p>
                <p className='text-xs text-muted-foreground'>{t('inventoryTransactions.detailDialog.itemLines', { count: transaction.items?.length ?? 0 })}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{t('inventoryTransactions.detailDialog.totalValuation')}</p>
                <p className='font-semibold text-base font-mono'>${Number(transaction.total_cost).toFixed(2)}</p>
                <p className='text-xs text-muted-foreground'>{transaction.currency}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{t('inventoryTransactions.detailDialog.createdDate')}</p>
                <p className='font-semibold text-xs'>{new Date(transaction.created_at).toLocaleString()}</p>
                {transaction.posted_at && (
                  <p className='text-[11px] text-emerald-600 font-medium'>
                    {t('inventoryTransactions.detailDialog.postedLabel', { date: new Date(transaction.posted_at).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>

            {transaction.notes && (
              <div className='p-3 bg-muted/20 border rounded-md text-sm'>
                <span className='font-medium text-muted-foreground'>{t('inventoryTransactions.detailDialog.notes')}</span>
                <span>{transaction.notes}</span>
              </div>
            )}

            <Tabs defaultValue='items' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='items'>{t('inventoryTransactions.detailDialog.lineItems', { count: transaction.items?.length ?? 0 })}</TabsTrigger>
                <TabsTrigger value='audit'>{t('inventoryTransactions.detailDialog.auditTrail', { count: transaction.audit_logs?.length ?? 0 })}</TabsTrigger>
              </TabsList>

              <TabsContent value='items' className='space-y-4 pt-2'>
                <div className='rounded-md border overflow-hidden'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('inventoryTransactions.detailDialog.variantSku')}</TableHead>
                        <TableHead className='text-end'>{t('inventoryTransactions.detailDialog.quantity')}</TableHead>
                        <TableHead className='text-end'>{t('inventoryTransactions.detailDialog.unitCost')}</TableHead>
                        <TableHead className='text-end'>{t('inventoryTransactions.detailDialog.total')}</TableHead>
                        <TableHead className='text-center'>{t('inventoryTransactions.detailDialog.stockSnapshot')}</TableHead>
                        <TableHead>{t('inventoryTransactions.detailDialog.condition')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transaction.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className='font-mono font-medium text-sm'>
                              {item.sku_snapshot ?? item.product_variants?.sku ?? item.product_variant_id.slice(0, 8)}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {item.product_name_snapshot ?? item.product_variants?.products?.name ?? '—'}
                            </div>
                          </TableCell>
                          <TableCell className='text-end font-mono font-semibold'>
                            {Number(item.quantity).toLocaleString()}
                          </TableCell>
                          <TableCell className='text-end font-mono text-xs'>
                            ${Number(item.unit_cost ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className='text-end font-mono text-sm font-medium'>
                            ${Number(item.total_cost ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className='text-center font-mono text-xs'>
                            {item.qty_before !== null && item.qty_after !== null ? (
                              <div className='inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded'>
                                <span>{Number(item.qty_before).toFixed(0)}</span>
                                <ArrowRight className='h-3 w-3 text-muted-foreground' />
                                <span className='font-bold text-foreground'>{Number(item.qty_after).toFixed(0)}</span>
                              </div>
                            ) : (
                              <span className='text-muted-foreground'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className='capitalize text-xs font-medium px-2 py-0.5 rounded bg-muted'>
                              {item.condition ?? t('inventoryTransactions.detailDialog.conditionGood')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value='audit' className='space-y-3 pt-2'>
                {transaction.audit_logs && transaction.audit_logs.length > 0 ? (
                  <div className='space-y-2'>
                    {transaction.audit_logs.map((log) => (
                      <div key={log.id} className='flex items-start gap-3 p-3 rounded-lg border bg-muted/20'>
                        <ShieldCheck className='h-5 w-5 text-primary mt-0.5' />
                        <div className='flex-1'>
                          <div className='flex items-center justify-between'>
                            <span className='font-semibold text-sm'>{t('inventoryTransactions.detailDialog.auditAction', { action: log.action })}</span>
                            <span className='text-xs text-muted-foreground font-mono'>
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className='text-xs text-muted-foreground mt-0.5'>
                            {t('inventoryTransactions.detailDialog.auditEntity', { entityType: log.entity_type, entityId: log.entity_id })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-center py-6 text-muted-foreground'>{t('inventoryTransactions.detailDialog.noAuditLogs')}</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Actions footer */}
            <div className='flex justify-end items-center gap-2 pt-4 border-t'>
              {transaction.status === 'draft' && (
                <>
                  <Button
                    variant='outline'
                    className='text-destructive hover:bg-destructive/10'
                    onClick={() => onCancelClick(transaction.id)}
                  >
                    <XCircle className='h-4 w-4 me-1.5' />
                    {t('inventoryTransactions.detailDialog.cancelTransaction')}
                  </Button>
                  <Button
                    onClick={() => postMutation.mutate(transaction.id)}
                    disabled={postMutation.isPending}
                    className='bg-emerald-600 hover:bg-emerald-700 text-white'
                  >
                    {postMutation.isPending ? (
                      <Loader2 className='h-4 w-4 animate-spin me-1.5' />
                    ) : (
                      <CheckCircle2 className='h-4 w-4 me-1.5' />
                    )}
                    {t('inventoryTransactions.detailDialog.postCommitStock')}
                  </Button>
                </>
              )}

              {transaction.status === 'posted' && !transaction.reversed_by_transaction_id && (
                <Button
                  variant='outline'
                  className='text-purple-600 hover:bg-purple-500/10 border-purple-500/30'
                  onClick={() => onReverseClick(transaction.id)}
                >
                  <RotateCcw className='h-4 w-4 me-1.5' />
                  {t('inventoryTransactions.detailDialog.reverseTransaction')}
                </Button>
              )}

              <Button variant='secondary' onClick={() => onOpenChange(false)}>
                {t('inventoryTransactions.detailDialog.close')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
