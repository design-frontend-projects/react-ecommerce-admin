import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth, useUser } from '@clerk/clerk-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Receipt,
  RotateCcw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  createRefund,
  getRecentPosSales,
  type PosTransactionRecord,
} from '../data/refund-api'
import { refundFormSchema, type RefundFormValues } from '../data/schema'
import { ManagerAuthDialog } from './manager-auth-dialog'

const REFUND_REASONS = [
  'Defective / Damaged',
  'Wrong Item',
  'Customer Changed Mind',
  'Overcharged',
  'Duplicate Transaction',
  'Other',
]

type Step = 'lookup' | 'details' | 'success'

const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
}

function TransactionRow({
  tx,
  onSelect,
}: {
  tx: PosTransactionRecord
  onSelect: () => void
}) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className='flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 active:scale-[.99]'
    >
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium'>{tx.transaction_number}</p>
        <p className='text-xs text-muted-foreground'>
          {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')} -{' '}
          {tx.transaction_details.length} item
          {tx.transaction_details.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className='ml-4 flex shrink-0 items-center gap-2'>
        <span className='text-sm font-semibold'>
          {formatCurrency(Number(tx.total_amount))}
        </span>
        <ChevronRight className='h-4 w-4 text-muted-foreground' />
      </div>
    </button>
  )
}

function refundStatusVariant(status: string | null) {
  switch (status) {
    case 'approved':
      return 'default' as const
    case 'rejected':
      return 'destructive' as const
    case 'waiting_manager':
    case 'waiting_review':
      return 'outline' as const
    default:
      return 'secondary' as const
  }
}

function formatRefundStatusLabel(status: string | null) {
  return (status ?? 'processed').replaceAll('_', ' ')
}

export function RefundDialog() {
  const selectedBranchId = useAuthStore.getState().auth.selectedBranchId
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [step, setStep] = useState<Step>('lookup')
  const [search, setSearch] = useState('')
  const [selectedTx, setSelectedTx] = useState<PosTransactionRecord | null>(
    null
  )
  const [newRefundId, setNewRefundId] = useState<string | null>(null)

  const { userId } = useAuth()
  const { user: clerkUser } = useUser()
  const queryClient = useQueryClient()

  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      transactionId: '',
      refundAmount: 0,
      reason: '',
      notes: '',
      clerk_user_id: clerkUser?.id ?? '',
      branch_id: selectedBranchId,
    },
  })

  const {
    data: recentSales = [],
    isLoading: isSalesLoading,
    isError: isSalesError,
  } = useQuery({
    queryKey: ['recent-pos-sales', search],
    queryFn: () => getRecentPosSales(search),
    enabled: open,
    staleTime: 30_000,
  })

  const refundableTransactions = useMemo(
    () => recentSales.filter((tx) => !tx.isRefunded),
    [recentSales]
  )

  const refundedMatches = useMemo(() => {
    if (!search.trim()) return []
    return recentSales.filter((tx) => tx.isRefunded)
  }, [recentSales, search])

  const refundMutation = useMutation({
    mutationFn: (values: RefundFormValues) =>
      createRefund({
        saleId: values.transactionId,
        refundAmount: values.refundAmount,
        reason: values.reason,
        processedBy: userId ?? '',
        notes: values.notes,
        orderId: selectedTx?.transaction_number as string,
        clerk_user_id: clerkUser?.id as string,
      }),
    onSuccess: (refundId) => {
      setNewRefundId(refundId)
      setStep('success')
      queryClient.invalidateQueries({ queryKey: ['recent-pos-sales'] })
      queryClient.invalidateQueries({ queryKey: ['shift-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['shift-dashboard-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['recent-pos-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
      toast.success('Refund processed successfully.')
    },
    onError: (err: Error) => {
      toast.error(`Failed to process refund: ${err.message}`)
    },
  })

  const resetDialog = () => {
    setStep('lookup')
    setSearch('')
    setSelectedTx(null)
    setNewRefundId(null)
    form.reset({
      transactionId: '',
      refundAmount: 0,
      reason: '',
      notes: '',
      clerk_user_id: clerkUser?.id ?? '',
      branch_id: selectedBranchId,
    })
  }

  const handleOpenChange = (val: boolean) => {
    if (!val) resetDialog()
    setOpen(val)
  }

  const handleSelectTx = (tx: PosTransactionRecord) => {
    setSelectedTx(tx)
    form.setValue('transactionId', tx.id)
    form.setValue('refundAmount', Number(tx.total_amount))
    setStep('details')
  }

  const handleRefundAttempt = async () => {
    if (!selectedTx) {
      toast.error('Please select a transaction first')
      return
    }

    form.setValue('transactionId', selectedTx.id)

    const valid = await form.trigger([
      'transactionId',
      'reason',
      'refundAmount',
    ])
    if (!valid) return

    setAuthOpen(true)
  }

  const handleManagerApproved = () => {
    if (!selectedTx) {
      toast.error('No transaction selected for refund')
      return
    }
    refundMutation.mutate(form.getValues())
  }

  const maxRefund = selectedTx ? Number(selectedTx.total_amount) : Infinity
  const hasSearch = search.trim().length > 0
  const hasNoLookupResults =
    !isSalesLoading &&
    !isSalesError &&
    refundableTransactions.length === 0 &&
    refundedMatches.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5'
        >
          <RotateCcw className='h-4 w-4' />
          <span className='hidden sm:inline'>Refund</span>
        </Button>
      </DialogTrigger>

      <DialogContent className='gap-0 overflow-hidden p-0 sm:max-w-lg'>
        <DialogHeader className='border-b bg-muted/30 px-6 pt-6 pb-4'>
          <DialogTitle className='flex items-center gap-2'>
            <RotateCcw className='h-5 w-5 text-destructive' />
            Process Refund
          </DialogTitle>

          {step !== 'success' && (
            <div className='flex items-center gap-2 pt-2 text-xs text-muted-foreground'>
              <span
                className={
                  step === 'lookup' ? 'font-semibold text-foreground' : ''
                }
              >
                1. Find Transaction
              </span>
              <ChevronRight className='h-3 w-3' />
              <span
                className={
                  step === 'details' ? 'font-semibold text-foreground' : ''
                }
              >
                2. Refund Details
              </span>
              <ChevronRight className='h-3 w-3' />
              <span>3. Manager Auth</span>
            </div>
          )}
        </DialogHeader>

        <AnimatePresence mode='wait' initial={false}>
          {step === 'lookup' && (
            <motion.div
              key='lookup'
              variants={slideVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={{ duration: 0.2 }}
              className='flex flex-col gap-4 px-6 py-5'
            >
              <div className='space-y-1'>
                <Label>Search by Transaction Number</Label>
                <div className='relative'>
                  <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    className='pl-9'
                    placeholder='e.g. POS-1234567890'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {hasSearch && refundedMatches.length > 0 && (
                <div className='space-y-2'>
                  <Label className='text-xs tracking-wide text-muted-foreground uppercase'>
                    Already Refunded
                  </Label>
                  <div className='space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3'>
                    {refundedMatches.map((tx) => {
                      const latestRefund = tx.latestRefund
                      return (
                        <div
                          key={`refunded-${tx.id}`}
                          className='rounded-md border border-amber-200 bg-background p-3'
                        >
                          <div className='flex items-start justify-between gap-2'>
                            <div>
                              <p className='text-sm font-semibold'>
                                {tx.transaction_number}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {latestRefund?.refund_date
                                  ? format(
                                      new Date(latestRefund.refund_date),
                                      'MMM d, yyyy h:mm a'
                                    )
                                  : 'Refund date unavailable'}
                              </p>
                            </div>
                            <Badge
                              variant={refundStatusVariant(
                                latestRefund?.refund_status ?? null
                              )}
                              className='capitalize'
                            >
                              {formatRefundStatusLabel(
                                latestRefund?.refund_status ?? null
                              )}
                            </Badge>
                          </div>

                          <div className='mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground'>
                            <p>
                              <span className='font-medium text-foreground'>
                                Refund ID:
                              </span>{' '}
                              {latestRefund
                                ? `#${latestRefund.refund_id}`
                                : '--'}
                            </p>
                            <p>
                              <span className='font-medium text-foreground'>
                                Refund Amount:
                              </span>{' '}
                              {formatCurrency(
                                Number(latestRefund?.refund_amount ?? 0)
                              )}
                            </p>
                            <p>
                              <span className='font-medium text-foreground'>
                                Reason:
                              </span>{' '}
                              {latestRefund?.reason || '--'}
                            </p>
                            <p className='truncate'>
                              <span className='font-medium text-foreground'>
                                Notes:
                              </span>{' '}
                              {latestRefund?.notes || '--'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className='space-y-1'>
                <Label className='text-xs tracking-wide text-muted-foreground uppercase'>
                  Recent Sales (Last 7 Days)
                </Label>

                {isSalesLoading && (
                  <div className='flex justify-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                  </div>
                )}

                {isSalesError && (
                  <div className='flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>
                    <AlertCircle className='h-4 w-4 shrink-0' />
                    Failed to load recent transactions.
                  </div>
                )}

                {!isSalesLoading && hasNoLookupResults && (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    {hasSearch
                      ? 'No transactions match your search.'
                      : 'No recent completed sales found.'}
                  </p>
                )}

                {!isSalesLoading &&
                  !isSalesError &&
                  hasSearch &&
                  refundableTransactions.length === 0 &&
                  refundedMatches.length > 0 && (
                    <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
                      Matching transactions are already refunded and cannot be
                      refunded again.
                    </p>
                  )}

                {!isSalesLoading && refundableTransactions.length > 0 && (
                  <ScrollArea className='max-h-72'>
                    <div className='space-y-2 pr-2'>
                      {refundableTransactions.map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          tx={tx}
                          onSelect={() => handleSelectTx(tx)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </motion.div>
          )}

          {step === 'details' && selectedTx && (
            <motion.div
              key='details'
              variants={slideVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={{ duration: 0.2 }}
              className='flex flex-col gap-4 px-6 py-5'
            >
              <div className='space-y-2 rounded-lg border bg-muted/30 p-4'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className='flex items-center gap-1.5 text-sm font-semibold'>
                      <Receipt className='h-4 w-4 text-muted-foreground' />
                      {selectedTx.transaction_number}
                    </p>
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      {format(
                        new Date(selectedTx.created_at),
                        'MMMM d, yyyy h:mm a'
                      )}
                    </p>
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    {formatCurrency(Number(selectedTx.total_amount))}
                  </Badge>
                </div>

                <Separator />

                <div className='space-y-1'>
                  {selectedTx.transaction_details.map((d) => (
                    <div
                      key={d.id}
                      className='flex justify-between text-xs text-muted-foreground'
                    >
                      <span className='mr-2 truncate'>
                        {d.products?.name ?? `Product #${d.product_id}`}{' '}
                        <span className='text-muted-foreground/60'>
                          x {Number(d.quantity)}
                        </span>
                      </span>
                      <span>{formatCurrency(Number(d.subtotal))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Form {...form}>
                <form className='space-y-4'>
                  <FormField
                    control={form.control}
                    name='reason'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Reason for Refund{' '}
                          <span className='text-destructive'>*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select a reason...' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REFUND_REASONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='refundAmount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Refund Amount{' '}
                          <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <span className='absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground'>
                              $
                            </span>
                            <Input
                              type='number'
                              step='0.01'
                              min='0.01'
                              max={maxRefund}
                              placeholder='0.00'
                              className='pl-7'
                              value={field.value === 0 ? '' : field.value}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        </FormControl>
                        <p className='text-xs text-muted-foreground'>
                          Max: {formatCurrency(maxRefund)}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='notes'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Additional Notes{' '}
                          <span className='text-xs text-muted-foreground'>
                            (Optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='Any additional context...'
                            className='resize-none'
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              <div className='flex gap-2 pt-1'>
                <Button
                  variant='outline'
                  className='flex-1'
                  onClick={() => setStep('lookup')}
                  disabled={refundMutation.isPending}
                >
                  Back
                </Button>
                <Button
                  variant='destructive'
                  className='flex-1'
                  onClick={handleRefundAttempt}
                  disabled={refundMutation.isPending}
                >
                  {refundMutation.isPending ? (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <RotateCcw className='mr-2 h-4 w-4' />
                  )}
                  Authorize &amp; Refund
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key='success'
              variants={slideVariants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={{ duration: 0.2 }}
              className='flex flex-col items-center gap-4 px-6 py-10 text-center'
            >
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                <CheckCircle2 className='h-8 w-8 text-green-600' />
              </div>
              <div>
                <p className='text-lg font-semibold'>Refund Processed</p>
                {newRefundId && (
                  <p className='text-sm text-muted-foreground'>
                    Refund #{newRefundId}
                  </p>
                )}
              </div>
              <Button
                className='mt-2 w-full'
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <ManagerAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleManagerApproved}
        isLoading={refundMutation.isPending}
      />
    </Dialog>
  )
}
