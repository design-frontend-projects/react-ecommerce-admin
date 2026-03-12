// ResPOS Shift Management Page
// Manage cashier shifts: open, close, and view shift history
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  DollarSign,
  Loader2,
  Plus,
  Timer,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { useShifts } from '../api/queries'
import { useShift } from '../hooks/use-shift'
import { useResposAuth } from '../hooks'
import { formatCurrency } from '../lib/formatters'
import type { ResShift } from '../types'

// ============ Animation Variants ============

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// ============ Zod Schemas ============

const openShiftSchema = z.object({
  openingCash: z
    .number({ invalid_type_error: 'Please enter a valid amount' })
    .min(0, 'Opening cash cannot be negative'),
})

const closeShiftSchema = z.object({
  closingCash: z
    .number({ invalid_type_error: 'Please enter a valid amount' })
    .min(0, 'Closing cash cannot be negative'),
  notes: z.string().optional(),
})

type OpenShiftFormValues = z.infer<typeof openShiftSchema>
type CloseShiftFormValues = z.infer<typeof closeShiftSchema>

// ============ Main Component ============

export function ShiftManagement() {
  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  const { employee, canOpenShift, isLoading: authLoading } = useResposAuth()
  const {
    shift: activeShift,
    isLoading: shiftLoading,
    isShiftOpen,
    openShift,
    closeShift,
    isOpening,
    isClosing,
  } = useShift()
  const { data: allShifts = [], isLoading: historyLoading } = useShifts()

  const isLoading = authLoading || shiftLoading

  // Separate closed shifts for history
  const closedShifts = allShifts.filter((s) => s.status === 'closed')

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Timer className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Shift Management</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <motion.div
          variants={container}
          initial='hidden'
          animate='show'
          className='space-y-6'
        >
          {/* Active Shift Section */}
          <motion.div variants={item}>
            {isLoading ? (
              <Card>
                <CardContent className='flex items-center justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </CardContent>
              </Card>
            ) : isShiftOpen && activeShift ? (
              <ActiveShiftCard
                shift={activeShift}
                onClose={() => setCloseDialogOpen(true)}
                isClosing={isClosing}
              />
            ) : (
              <NoActiveShiftCard
                onOpen={() => setOpenDialogOpen(true)}
                canOpen={canOpenShift}
              />
            )}
          </motion.div>

          {/* Shift History */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Clock className='h-5 w-5 text-muted-foreground' />
                  Shift History
                </CardTitle>
                <CardDescription>
                  Past shifts and their details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className='flex justify-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                  </div>
                ) : closedShifts.length === 0 ? (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    No shift history yet. Open and close your first shift to see
                    it here.
                  </p>
                ) : (
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Opened At</TableHead>
                          <TableHead>Closed At</TableHead>
                          <TableHead className='text-right'>
                            Opening Cash
                          </TableHead>
                          <TableHead className='text-right'>
                            Closing Cash
                          </TableHead>
                          <TableHead className='text-right'>
                            Variance
                          </TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {closedShifts.map((s) => (
                          <ShiftHistoryRow key={s.id} shift={s} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Main>

      {/* Open Shift Dialog */}
      <OpenShiftDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
        employeeName={
          employee
            ? `${employee.first_name} ${employee.last_name}`
            : 'Unknown'
        }
        isPending={isOpening}
        onSubmit={async (values) => {
          if (!employee) return
          try {
            await openShift(employee.id, values.openingCash)
            toast.success('Shift opened successfully')
            setOpenDialogOpen(false)
          } catch {
            toast.error('Failed to open shift')
          }
        }}
      />

      {/* Close Shift Dialog */}
      <CloseShiftDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        openingCash={activeShift?.opening_cash ?? 0}
        isPending={isClosing}
        onSubmit={async (values) => {
          if (!employee) return
          try {
            await closeShift(employee.id, values.closingCash, values.notes)
            toast.success('Shift closed successfully')
            setCloseDialogOpen(false)
          } catch {
            toast.error('Failed to close shift')
          }
        }}
      />
    </>
  )
}

// ============ Active Shift Card ============

function ActiveShiftCard({
  shift,
  onClose,
  isClosing,
}: {
  shift: ResShift
  onClose: () => void
  isClosing: boolean
}) {
  return (
    <Card className='border-green-500/30 bg-green-500/5'>
      <CardHeader className='flex flex-row items-start justify-between pb-2'>
        <div className='space-y-1'>
          <CardTitle className='flex items-center gap-2'>
            <div className='h-3 w-3 animate-pulse rounded-full bg-green-500' />
            Active Shift
          </CardTitle>
          <CardDescription>
            Opened{' '}
            {formatDistanceToNow(new Date(shift.opened_at), {
              addSuffix: true,
            })}
          </CardDescription>
        </div>
        <Button
          variant='destructive'
          size='sm'
          onClick={onClose}
          disabled={isClosing}
          className='gap-2'
        >
          {isClosing ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <X className='h-4 w-4' />
          )}
          Close Shift
        </Button>
      </CardHeader>
      <CardContent>
        <div className='grid gap-4 sm:grid-cols-3'>
          <div className='space-y-1'>
            <p className='text-sm text-muted-foreground'>Opened At</p>
            <p className='font-medium'>
              {format(new Date(shift.opened_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-sm text-muted-foreground'>Opening Cash</p>
            <p className='font-medium'>
              {formatCurrency(shift.opening_cash)}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-sm text-muted-foreground'>Duration</p>
            <p className='font-medium'>
              {formatDistanceToNow(new Date(shift.opened_at))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ No Active Shift Card ============

function NoActiveShiftCard({
  onOpen,
  canOpen,
}: {
  onOpen: () => void
  canOpen: boolean
}) {
  return (
    <Card className='border-dashed'>
      <CardContent className='flex flex-col items-center justify-center gap-4 py-12'>
        <div className='rounded-full bg-muted p-4'>
          <Timer className='h-8 w-8 text-muted-foreground' />
        </div>
        <div className='space-y-1 text-center'>
          <h3 className='text-lg font-semibold'>No Active Shift</h3>
          <p className='text-sm text-muted-foreground'>
            {canOpen
              ? 'Open a new shift to start tracking cash and orders.'
              : 'You do not have permission to open a shift.'}
          </p>
        </div>
        {canOpen && (
          <Button onClick={onOpen} className='gap-2'>
            <Plus className='h-4 w-4' />
            Open New Shift
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ============ Open Shift Dialog ============

function OpenShiftDialog({
  open,
  onOpenChange,
  employeeName,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  isPending: boolean
  onSubmit: (values: OpenShiftFormValues) => Promise<void>
}) {
  const form = useForm<OpenShiftFormValues>({
    resolver: zodResolver(openShiftSchema),
    defaultValues: { openingCash: 0 },
  })

  const handleSubmit = async (values: OpenShiftFormValues) => {
    await onSubmit(values)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <BadgeCheck className='h-5 w-5 text-green-500' />
            Open New Shift
          </DialogTitle>
          <DialogDescription>
            Start a new shift for <strong>{employeeName}</strong>. Count the
            cash in the register and enter the amount below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='openingCash'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Cash</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <DollarSign className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        type='number'
                        step='0.01'
                        min='0'
                        placeholder='0.00'
                        className='pl-9'
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending} className='gap-2'>
                {isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                Open Shift
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ============ Close Shift Dialog ============

function CloseShiftDialog({
  open,
  onOpenChange,
  openingCash,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  openingCash: number
  isPending: boolean
  onSubmit: (values: CloseShiftFormValues) => Promise<void>
}) {
  const form = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: { closingCash: 0, notes: '' },
  })

  const closingCash = form.watch('closingCash')
  const variance = closingCash - openingCash

  const handleSubmit = async (values: CloseShiftFormValues) => {
    await onSubmit(values)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertCircle className='h-5 w-5 text-orange-500' />
            Close Shift
          </DialogTitle>
          <DialogDescription>
            Count the cash in the register and enter the closing amount. Add any
            notes about discrepancies.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
          >
            {/* Opening cash reference */}
            <div className='rounded-lg bg-muted/50 p-3'>
              <p className='text-sm text-muted-foreground'>Opening Cash</p>
              <p className='text-lg font-semibold'>
                {formatCurrency(openingCash)}
              </p>
            </div>

            <FormField
              control={form.control}
              name='closingCash'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closing Cash</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <DollarSign className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        type='number'
                        step='0.01'
                        min='0'
                        placeholder='0.00'
                        className='pl-9'
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cash variance indicator */}
            {closingCash > 0 && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 ${
                  variance >= 0
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
              >
                {variance >= 0 ? (
                  <ArrowUpRight className='h-4 w-4' />
                ) : (
                  <ArrowDownRight className='h-4 w-4' />
                )}
                <span className='text-sm font-medium'>
                  Variance: {formatCurrency(variance)}
                </span>
              </div>
            )}

            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Any notes about this shift...'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                variant='destructive'
                disabled={isPending}
                className='gap-2'
              >
                {isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                Close Shift
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ============ Shift History Row ============

function ShiftHistoryRow({ shift }: { shift: ResShift }) {
  const variance =
    shift.closing_cash != null
      ? shift.closing_cash - shift.opening_cash
      : null

  return (
    <TableRow>
      <TableCell>
        <Badge
          variant={shift.status === 'open' ? 'default' : 'secondary'}
          className='capitalize'
        >
          {shift.status}
        </Badge>
      </TableCell>
      <TableCell className='whitespace-nowrap'>
        {format(new Date(shift.opened_at), 'MMM d, yyyy HH:mm')}
      </TableCell>
      <TableCell className='whitespace-nowrap'>
        {shift.closed_at
          ? format(new Date(shift.closed_at), 'MMM d, yyyy HH:mm')
          : '—'}
      </TableCell>
      <TableCell className='text-right'>
        {formatCurrency(shift.opening_cash)}
      </TableCell>
      <TableCell className='text-right'>
        {shift.closing_cash != null ? formatCurrency(shift.closing_cash) : '—'}
      </TableCell>
      <TableCell className='text-right'>
        {variance != null ? (
          <span
            className={
              variance >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }
          >
            {variance >= 0 ? '+' : ''}
            {formatCurrency(variance)}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className='max-w-[200px] truncate'>
        {shift.notes || '—'}
      </TableCell>
    </TableRow>
  )
}
