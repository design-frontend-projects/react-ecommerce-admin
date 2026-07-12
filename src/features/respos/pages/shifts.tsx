// ResPOS Shift Management Page
// Manage cashier shifts: open, close, and view shift history
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { format, formatDistanceToNow } from 'date-fns'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useAuth, useUser } from '@/hooks/use-auth'
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
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { hasAnyPermission } from '@/features/users/data/rbac'
import { useRBACStore } from '@/features/users/data/store'
import { useShifts } from '../api/queries'
import { useShiftExpected, useShiftSettings } from '../api/shift-hooks'
import { CashMovementDialog } from '../components/cash-movement-dialog'
import { NotificationsDropdown } from '../components/notifications-dropdown'
import { ShiftAnalyticsTab } from '../components/shift-analytics-tab'
import { ShiftsAdminTable } from '../components/shifts-admin-table'
import { WhosWorkingTab } from '../components/whos-working-tab'
import { RoleNames } from '../constants'
import { useShift } from '../hooks/use-shift'
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
    .number({ message: 'Please enter a valid amount' })
    .min(0, 'Opening cash cannot be negative'),
})

const closeShiftSchema = z.object({
  closingCash: z
    .number({ message: 'Please enter a valid amount' })
    .min(0, 'Closing cash cannot be negative'),
  notes: z.string().optional(),
})

export type OpenShiftFormValues = z.infer<typeof openShiftSchema>
export type CloseShiftFormValues = z.infer<typeof closeShiftSchema>

// ============ Main Component ============

export function ShiftManagement() {
  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)

  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const authUserId = user?.id ?? null
  const {
    shift: activeShift,
    isLoading: shiftLoading,
    isShiftOpen,
    openShift,
    closeShift,
    isOpening,
    isClosing,
  } = useShift({ authUserId })

  const roleNames = useRBACStore((state) => state.currentRoleNames)
  const permissionNames = useRBACStore((state) => state.currentPermissionNames)
  const isAdminRole =
    user?.role === RoleNames.admin || user?.role === RoleNames.super_admin
  const canViewAll =
    hasAnyPermission(permissionNames, ['shifts.view']) || isAdminRole
  const canManage =
    hasAnyPermission(permissionNames, ['shifts.manage']) || isAdminRole
  const canOpen =
    hasAnyPermission(permissionNames, ['shifts.use', 'shifts.manage']) ||
    isAdminRole ||
    roleNames.includes('cashier')

  // Own history only; organization-wide history lives in the All Shifts tab.
  const { data: allShifts = [], isLoading: historyLoading } =
    useShifts(authUserId)

  const isLoading = !isLoaded || shiftLoading

  // Separate closed shifts for history
  const closedShifts = allShifts.filter((s) => s.status !== 'open')
  const lastClosedShift = closedShifts[0]
  const previousClosingCash = lastClosedShift?.closing_cash ?? 0

  // Server-computed expected cash + thresholds for the close dialog.
  const { data: expected } = useShiftExpected(
    closeDialogOpen ? (activeShift?.id ?? null) : null
  )
  const { data: shiftSettings } = useShiftSettings(
    activeShift?.restaurant_id ?? null,
    activeShift?.branch_id ?? null,
    { enabled: canOpen && !!activeShift }
  )

  if (!isSignedIn && !isLoaded) {
    // return redirect({ to: "/sign-in" })
    return (
      <>
        <Header>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'>
              <Timer className='h-5 w-5' />
            </div>
            <div>
              <h1 className='text-xl font-bold tracking-tight'>
                Shift Control
              </h1>
              <p className='text-xs font-medium text-muted-foreground'>
                Manage station sessions and cash flow
              </p>
            </div>
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <NotificationsDropdown />
            <Separator orientation='vertical' className='mx-2 h-6' />
            <LanguageSwitch />
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
      </>
    )
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'>
            <Timer className='h-5 w-5' />
          </div>
          <div>
            <h1 className='text-xl font-bold tracking-tight'>Shift Control</h1>
            <p className='text-xs font-medium text-muted-foreground'>
              Manage station sessions and cash flow
            </p>
          </div>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <NotificationsDropdown />
          <Separator orientation='vertical' className='mx-2 h-6' />
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
          className='mx-auto max-w-6xl space-y-8 pb-12'
        >
          {(() => {
            const myShiftContent = (
              <div className='space-y-8'>
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
                      onAddMovement={() => setMovementDialogOpen(true)}
                      isClosing={isClosing}
                    />
                  ) : (
                    <NoActiveShiftCard
                      onOpen={() => setOpenDialogOpen(true)}
                      canOpen={isLoaded && canOpen}
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
                          No shift history yet. Open and close your first shift
                          to see it here.
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
              </div>
            )

            if (!canViewAll) {
              return myShiftContent
            }

            return (
              <Tabs defaultValue='my-shift'>
                <TabsList className='mb-6'>
                  <TabsTrigger value='my-shift'>My Shift</TabsTrigger>
                  <TabsTrigger value='all-shifts'>All Shifts</TabsTrigger>
                  <TabsTrigger value='live'>Live</TabsTrigger>
                  <TabsTrigger value='analytics'>Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value='my-shift'>{myShiftContent}</TabsContent>
                <TabsContent value='all-shifts'>
                  <ShiftsAdminTable
                    restaurantId={activeShift?.restaurant_id ?? null}
                  />
                </TabsContent>
                <TabsContent value='live'>
                  <WhosWorkingTab canManage={canManage} />
                </TabsContent>
                <TabsContent value='analytics'>
                  <ShiftAnalyticsTab />
                </TabsContent>
              </Tabs>
            )
          })()}
        </motion.div>
      </Main>

      {/* Open Shift Dialog */}
      <OpenShiftDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
        employeeName={user ? `${user.fullName} ` : 'Unknown'}
        isPending={isOpening}
        defaultOpeningCash={previousClosingCash}
        onSubmit={async (values) => {
          if (!user) return
          try {
            await openShift(user.id, values.openingCash)
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
        expectedCash={expected ? Number(expected.expected) : null}
        cashSales={expected ? Number(expected.cashSales) : null}
        movementsIn={expected ? Number(expected.movementsIn) : null}
        movementsOut={expected ? Number(expected.movementsOut) : null}
        varianceThreshold={
          shiftSettings ? Number(shiftSettings.varianceThreshold) : undefined
        }
        requireCommentOverThreshold={
          shiftSettings?.requireCommentOverThreshold ?? false
        }
        onSubmit={async (values) => {
          if (!user) return
          try {
            await closeShift(user.id, values.closingCash, values.notes)
            toast.success('Shift closed successfully')
            setCloseDialogOpen(false)
          } catch (error) {
            toast.error(
              error instanceof Error && error.message
                ? error.message
                : 'Failed to close shift'
            )
          }
        }}
      />

      {/* Cash Movement Dialog */}
      <CashMovementDialog
        shiftId={activeShift?.id ?? null}
        open={movementDialogOpen}
        onOpenChange={setMovementDialogOpen}
      />
    </>
  )
}

// ============ Active Shift Card ============

function ActiveShiftCard({
  shift,
  onClose,
  onAddMovement,
  isClosing,
}: {
  shift: ResShift
  onClose: () => void
  onAddMovement?: () => void
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
        <div className='flex items-center gap-2'>
          {onAddMovement && (
            <Button
              variant='outline'
              size='sm'
              onClick={onAddMovement}
              disabled={isClosing}
              className='gap-2'
            >
              <DollarSign className='h-4 w-4' />
              Cash Movement
            </Button>
          )}
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
        </div>
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
            <p className='font-medium'>{formatCurrency(shift.opening_cash)}</p>
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

export function OpenShiftDialog({
  open,
  onOpenChange,
  employeeName,
  isPending,
  defaultOpeningCash = 0,
  nonDismissible = false,
  showCancelButton = true,
  lockOpeningCash = false,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  isPending: boolean
  defaultOpeningCash?: number
  nonDismissible?: boolean
  showCancelButton?: boolean
  lockOpeningCash?: boolean
  onSubmit: (values: OpenShiftFormValues) => Promise<void>
}) {
  const form = useForm<OpenShiftFormValues>({
    resolver: zodResolver(openShiftSchema),
    defaultValues: { openingCash: defaultOpeningCash },
  })

  useEffect(() => {
    if (open) {
      form.reset({ openingCash: defaultOpeningCash })
    }
  }, [defaultOpeningCash, form, open])

  const handleSubmit = async (values: OpenShiftFormValues) => {
    await onSubmit(values)
    form.reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nonDismissible && !nextOpen) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        className='sm:max-w-md'
        showCloseButton={!nonDismissible}
        onEscapeKeyDown={(event) => {
          if (nonDismissible) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (nonDismissible) event.preventDefault()
        }}
      >
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
                      <DollarSign className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        type='number'
                        step='0.01'
                        min='0'
                        placeholder='0.00'
                        className='pl-9'
                        readOnly={lockOpeningCash}
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
              {showCancelButton && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                  disabled={isPending || nonDismissible}
                >
                  Cancel
                </Button>
              )}
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

export function CloseShiftDialog({
  open,
  onOpenChange,
  openingCash,
  isPending,
  onSubmit,
  expectedCash = null,
  cashSales = null,
  movementsIn = null,
  movementsOut = null,
  varianceThreshold,
  requireCommentOverThreshold = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  openingCash: number
  isPending: boolean
  onSubmit: (values: CloseShiftFormValues) => Promise<void>
  /** Server-computed expected cash (opening + cash sales ± movements). When
   * provided, the variance is measured against it instead of the opening. */
  expectedCash?: number | null
  cashSales?: number | null
  movementsIn?: number | null
  movementsOut?: number | null
  varianceThreshold?: number
  requireCommentOverThreshold?: boolean
}) {
  const form = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: { closingCash: 0, notes: '' },
  })

  const closingCash =
    useWatch({ control: form.control, name: 'closingCash' }) ?? 0
  const varianceBaseline = expectedCash ?? openingCash
  const variance = closingCash - varianceBaseline
  const isOverThreshold =
    varianceThreshold !== undefined && Math.abs(variance) > varianceThreshold

  const handleSubmit = async (values: CloseShiftFormValues) => {
    if (
      requireCommentOverThreshold &&
      isOverThreshold &&
      !values.notes?.trim()
    ) {
      form.setError('notes', {
        message:
          'A comment is required because the variance exceeds the threshold.',
      })
      return
    }
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
            {/* Opening / expected cash reference */}
            <div className='space-y-2 rounded-lg bg-muted/50 p-3'>
              <div className='flex items-center justify-between'>
                <p className='text-sm text-muted-foreground'>Opening Cash</p>
                <p className='text-sm font-semibold'>
                  {formatCurrency(openingCash)}
                </p>
              </div>
              {cashSales !== null && (
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-muted-foreground'>Cash Sales</p>
                  <p className='text-sm font-semibold'>
                    {formatCurrency(cashSales)}
                  </p>
                </div>
              )}
              {movementsIn !== null && movementsIn !== 0 && (
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-muted-foreground'>Paid In</p>
                  <p className='text-sm font-semibold'>
                    {formatCurrency(movementsIn)}
                  </p>
                </div>
              )}
              {movementsOut !== null && movementsOut !== 0 && (
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-muted-foreground'>Paid Out</p>
                  <p className='text-sm font-semibold'>
                    -{formatCurrency(movementsOut)}
                  </p>
                </div>
              )}
              {expectedCash !== null && (
                <div className='flex items-center justify-between border-t pt-2'>
                  <p className='text-sm font-medium'>Expected Cash</p>
                  <p className='text-lg font-semibold'>
                    {formatCurrency(expectedCash)}
                  </p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name='closingCash'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closing Cash</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <DollarSign className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
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
                  <FormLabel>
                    {requireCommentOverThreshold && isOverThreshold
                      ? 'Notes (required — variance exceeds threshold)'
                      : 'Notes (optional)'}
                  </FormLabel>
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

type ShiftWithEmployee = ResShift & {
  opener?: { first_name: string; last_name: string }
  closer?: { first_name: string; last_name: string }
}

function ShiftHistoryRow({
  shift,
  isAdmin,
}: {
  shift: ShiftWithEmployee
  isAdmin?: boolean
}) {
  // Prefer the server-computed variance snapshot (counted − expected); fall
  // back to the legacy closing − opening for shifts closed before specs/026.
  const variance =
    shift.variance != null
      ? Number(shift.variance)
      : typeof shift.closing_cash === 'number'
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
      {isAdmin && (
        <TableCell>
          {shift.opener
            ? `${shift.opener.first_name} ${shift.opener.last_name}`
            : shift.opened_by}
        </TableCell>
      )}
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
