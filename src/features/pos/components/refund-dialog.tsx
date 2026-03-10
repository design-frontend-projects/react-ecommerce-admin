import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  RotateCcw,
  Loader2,
  Search,
  Receipt,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  createRefund,
  getRecentPosSales,
  type PosTransactionRecord,
} from '../data/refund-api'
import { refundFormSchema, type RefundFormValues } from '../data/schema'
import { ManagerAuthDialog } from './manager-auth-dialog'

// ─── Constants ────────────────────────────────────────────────────────────────

const REFUND_REASONS = [
  'Defective / Damaged',
  'Wrong Item',
  'Customer Changed Mind',
  'Overcharged',
  'Duplicate Transaction',
  'Other',
]

type Step = 'lookup' | 'details' | 'success'

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        <p className='truncate font-medium text-sm'>{tx.transaction_number}</p>
        <p className='text-xs text-muted-foreground'>
          {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')} ·{' '}
          {tx.transaction_details.length} item
          {tx.transaction_details.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className='ml-4 flex items-center gap-2 shrink-0'>
        <span className='font-semibold text-sm'>
          {formatCurrency(tx.total_amount)}
        </span>
        <ChevronRight className='h-4 w-4 text-muted-foreground' />
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RefundDialog() {
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [step, setStep] = useState<Step>('lookup')
  const [search, setSearch] = useState('')
  const [selectedTx, setSelectedTx] =
    useState<PosTransactionRecord | null>(null)
  const [newRefundId, setNewRefundId] = useState<string | null>(null)

  const { userId } = useAuth()
  const queryClient = useQueryClient()

  // ─── Fetch recent sales ────────────────────────────────────────────────
  const {
    data: recentSales = [],
    isLoading: isSalesLoading,
    isError: isSalesError,
  } = useQuery({
    queryKey: ['recent-pos-sales'],
    queryFn: getRecentPosSales,
    enabled: open,
    staleTime: 30_000,
  })

  // ─── Form ──────────────────────────────────────────────────────────────
  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      transactionId: '',
      refundAmount: 0,
      reason: '',
      notes: '',
    },
  })

  // ─── Refund mutation ───────────────────────────────────────────────────
  const refundMutation = useMutation({
    mutationFn: (values: RefundFormValues) =>
      createRefund({
        saleId: values.transactionId,
        refundAmount: values.refundAmount,
        reason: values.reason,
        processedBy: userId ?? '',
        notes: values.notes,
      }),
    onSuccess: (refundId) => {
      setNewRefundId(refundId)
      setStep('success')
      queryClient.invalidateQueries({ queryKey: ['shift-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['recent-pos-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
      toast.success('Refund processed successfully.')
    },
    onError: (err: Error) => {
      toast.error('Failed to process refund: ' + err.message)
    },
  })

  // ─── Event handlers ────────────────────────────────────────────────────
  const handleOpenChange = (val: boolean) => {
    if (!val) resetDialog()
    setOpen(val)
  }

  const resetDialog = () => {
    setStep('lookup')
    setSearch('')
    setSelectedTx(null)
    setNewRefundId(null)
    form.reset()
  }

  const handleSelectTx = (tx: PosTransactionRecord) => {
    setSelectedTx(tx)
    form.setValue('transactionId', tx.transaction_id)
    form.setValue('refundAmount', Number(tx.total_amount))
    setStep('details')
  }

  const handleRefundAttempt = async () => {
    const valid = await form.trigger(['reason', 'refundAmount'])
    if (!valid) return
    setAuthOpen(true)
  }

  const handleManagerApproved = () => {
    form.handleSubmit((values) => refundMutation.mutate(values))()
  }

  // ─── Filtered sales list ────────────────────────────────────────────────
  const filteredSales = search
    ? recentSales.filter((tx) =>
        tx.transaction_number.toLowerCase().includes(search.toLowerCase())
      )
    : recentSales

  // ─── Refund amount max-guard ────────────────────────────────────────────
  const maxRefund = selectedTx ? Number(selectedTx.total_amount) : Infinity

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5'>
          <RotateCcw className='h-4 w-4' />
          <span className='hidden sm:inline'>Refund</span>
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-lg p-0 overflow-hidden gap-0'>
        <DialogHeader className='px-6 pt-6 pb-4 border-b bg-muted/30'>
          <DialogTitle className='flex items-center gap-2'>
            <RotateCcw className='h-5 w-5 text-destructive' />
            Process Refund
          </DialogTitle>

          {/* Step indicator */}
          {step !== 'success' && (
            <div className='flex items-center gap-2 pt-2 text-xs text-muted-foreground'>
              <span className={step === 'lookup' ? 'font-semibold text-foreground' : ''}>
                1. Find Transaction
              </span>
              <ChevronRight className='h-3 w-3' />
              <span className={step === 'details' ? 'font-semibold text-foreground' : ''}>
                2. Refund Details
              </span>
              <ChevronRight className='h-3 w-3' />
              <span>3. Manager Auth</span>
            </div>
          )}
        </DialogHeader>

        <AnimatePresence mode='wait' initial={false}>
          {/* ── STEP 1: Lookup ──────────────────────────────────────────── */}
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
                  <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    className='pl-9'
                    placeholder='e.g. POS-1234567890'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='text-muted-foreground text-xs uppercase tracking-wide'>
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

                {!isSalesLoading && filteredSales.length === 0 && (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    {search ? 'No transactions match your search.' : 'No recent completed sales found.'}
                  </p>
                )}

                {!isSalesLoading && filteredSales.length > 0 && (
                  <ScrollArea className='max-h-72'>
                    <div className='space-y-2 pr-2'>
                      {filteredSales.map((tx) => (
                        <TransactionRow
                          key={tx.transaction_id}
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

          {/* ── STEP 2: Details ──────────────────────────────────────────── */}
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
              {/* Transaction summary card */}
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className='font-semibold text-sm flex items-center gap-1.5'>
                      <Receipt className='h-4 w-4 text-muted-foreground' />
                      {selectedTx.transaction_number}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {format(new Date(selectedTx.created_at), 'MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    {formatCurrency(selectedTx.total_amount)}
                  </Badge>
                </div>

                <Separator />

                {/* Line items */}
                <div className='space-y-1'>
                  {selectedTx.transaction_details.map((d) => (
                    <div
                      key={d.detail_id}
                      className='flex justify-between text-xs text-muted-foreground'
                    >
                      <span className='truncate mr-2'>
                        {d.products?.name ?? `Product #${d.product_id}`}{' '}
                        <span className='text-muted-foreground/60'>× {d.quantity}</span>
                      </span>
                      <span>{formatCurrency(d.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund form */}
              <Form {...form}>
                <form className='space-y-4'>
                  {/* Reason */}
                  <FormField
                    control={form.control}
                    name='reason'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Refund <span className='text-destructive'>*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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

                  {/* Amount */}
                  <FormField
                    control={form.control}
                    name='refundAmount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refund Amount <span className='text-destructive'>*</span></FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm'>
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

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name='notes'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes <span className='text-muted-foreground text-xs'>(Optional)</span></FormLabel>
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

              {/* Actions */}
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

          {/* ── STEP 3: Success ──────────────────────────────────────────── */}
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

      {/* Manager Authorization — launched from Step 2 */}
      <ManagerAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleManagerApproved}
      />
    </Dialog>
  )
}
