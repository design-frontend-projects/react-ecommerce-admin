import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import {
  CalendarClock,
  Clock3,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Table2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useUpdateReservationStatus } from '../api/mutations'
import { useReservations } from '../api/queries'
import { ReservationCalendar } from '../components/reservation-calendar'
import { ReservationDialog } from '../components/reservation-dialog'
import { useResposRealtime } from '../hooks/use-realtime'
import type { ResReservation, ResTable } from '../types'

type DateScope = 'today' | 'week'
type ReservationWithTable = ResReservation & { table?: ResTable | null }

function parseReservationDateTime(date: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  const dateTime = new Date(`${date}T${normalizedTime}`)
  if (Number.isNaN(dateTime.getTime())) return null
  return dateTime
}

function getStatusBadgeVariant(status: ResReservation['status']) {
  if (status === 'cancelled') return 'destructive' as const
  if (status === 'confirmed') return 'secondary' as const
  if (status === 'completed') return 'default' as const
  return 'outline' as const
}

function formatTimeRange(reservation: ReservationWithTable) {
  const start = parseReservationDateTime(
    reservation.reservation_date,
    reservation.reservation_time
  )
  if (!start) return reservation.reservation_time

  const end = new Date(start.getTime() + reservation.duration_minutes * 60000)
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
}

function ReservationInsightCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className='rounded-md border bg-muted/30 p-3'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='text-lg font-semibold'>{value}</p>
    </div>
  )
}

export function Reservations() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] =
    useState<ResReservation | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [scope, setScope] = useState<DateScope>('today')

  const todayDate = format(new Date(), 'yyyy-MM-dd')
  const weekEndDate = format(addDays(new Date(), 6), 'yyyy-MM-dd')

  const reservationParams = useMemo(
    () =>
      scope === 'today'
        ? { date: todayDate }
        : { from: todayDate, to: weekEndDate },
    [scope, todayDate, weekEndDate]
  )

  // Real-time updates
  useResposRealtime({
    tables: ['res_reservations', 'res_tables'],
  })

  const {
    data: reservationsData = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useReservations(reservationParams)

  const cancelReservationMutation = useUpdateReservationStatus()

  const reservations = reservationsData as ReservationWithTable[]

  const handleCreateNew = () => {
    setSelectedReservation(null)
    setSelectedDate(new Date())
    setDialogOpen(true)
  }

  const handleEventClick = (reservation: ResReservation) => {
    setSelectedReservation(reservation)
    setDialogOpen(true)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedReservation(null)
    setSelectedDate(date)
    setDialogOpen(true)
  }

  const handleRefresh = async () => {
    try {
      await refetch()
    } catch {
      toast.error('Failed to refresh reservations')
    }
  }

  const handleCancelReservation = async (reservation: ReservationWithTable) => {
    if (reservation.status === 'cancelled') return

    const isConfirmed = window.confirm(
      `Cancel reservation for ${reservation.customer_name}?`
    )

    if (!isConfirmed) return

    try {
      await cancelReservationMutation.mutateAsync({
        reservationId: reservation.id,
        status: 'cancelled',
      })
      toast.success('Reservation cancelled')
    } catch {
      toast.error('Failed to cancel reservation')
    }
  }

  const handleClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedReservation(null)
    }
  }

  const lastUpdatedAt = useMemo(
    () => (dataUpdatedAt ? new Date(dataUpdatedAt) : new Date()),
    [dataUpdatedAt]
  )

  const todayReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) => reservation.reservation_date === todayDate
      ),
    [reservations, todayDate]
  )

  const todayPendingCount = todayReservations.filter(
    (reservation) => reservation.status === 'pending'
  ).length

  const todayConfirmedCount = todayReservations.filter(
    (reservation) => reservation.status === 'confirmed'
  ).length

  const todayCancelledCount = todayReservations.filter(
    (reservation) => reservation.status === 'cancelled'
  ).length

  const averagePartySize =
    todayReservations.length > 0
      ? todayReservations.reduce(
          (sum, reservation) => sum + reservation.party_size,
          0
        ) / todayReservations.length
      : 0

  const currentBookedTables = useMemo(() => {
    const now = new Date()

    const activeReservations = todayReservations
      .filter(
        (reservation) =>
          (reservation.status === 'pending' ||
            reservation.status === 'confirmed') &&
          reservation.table_id &&
          reservation.table
      )
      .map((reservation) => {
        const start = parseReservationDateTime(
          reservation.reservation_date,
          reservation.reservation_time
        )
        if (!start) return null

        const end = new Date(
          start.getTime() + reservation.duration_minutes * 60000
        )

        return {
          reservation,
          start,
          end,
          proximityMs:
            start.getTime() >= now.getTime()
              ? start.getTime() - now.getTime()
              : now.getTime() - start.getTime(),
        }
      })
      .filter(
        (
          item
        ): item is {
          reservation: ReservationWithTable
          start: Date
          end: Date
          proximityMs: number
        } => Boolean(item)
      )
      .filter((item) => item.end.getTime() >= now.getTime())

    const perTableMap = new Map<
      string,
      {
        reservation: ReservationWithTable
        start: Date
        end: Date
        proximityMs: number
      }
    >()

    for (const item of activeReservations) {
      const tableId = item.reservation.table_id
      if (!tableId) continue

      const current = perTableMap.get(tableId)
      if (!current || item.proximityMs < current.proximityMs) {
        perTableMap.set(tableId, item)
      }
    }

    return Array.from(perTableMap.values()).sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    )
  }, [todayReservations])

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <CalendarClock className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Reservations Command Center</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <Select
            value={scope}
            onValueChange={(value) => setScope(value as DateScope)}
          >
            <SelectTrigger className='w-[130px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='today'>Today</SelectItem>
              <SelectItem value='week'>This Week</SelectItem>
            </SelectContent>
          </Select>
          <div className='hidden text-xs text-muted-foreground md:block'>
            {isFetching
              ? 'Syncing...'
              : `Updated ${format(lastUpdatedAt, 'HH:mm:ss')}`}
          </div>
          <Button
            variant='outline'
            size='icon'
            onClick={handleRefresh}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <RefreshCw className='h-4 w-4' />
            )}
            <span className='sr-only'>Refresh</span>
          </Button>
          <Button onClick={handleCreateNew} size='sm' className='gap-2'>
            <Plus className='h-4 w-4' />
            New Reservation
          </Button>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className='flex h-full flex-col gap-4 p-4'>
          <div className='grid min-h-0 flex-1 gap-4 xl:grid-cols-[2fr_1fr]'>
            <div className='grid min-h-0 gap-4'>
              <Card className='min-h-0 overflow-hidden'>
                <CardHeader className='pb-2'>
                  <CardTitle>Reservation Calendar</CardTitle>
                </CardHeader>
                <CardContent className='h-[420px] overflow-hidden p-2'>
                  {isLoading ? (
                    <div className='flex h-full items-center justify-center'>
                      <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
                    </div>
                  ) : (
                    <ReservationCalendar
                      reservations={reservations}
                      onEventClick={handleEventClick}
                      onDateSelect={handleDateSelect}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className='min-h-0 overflow-hidden'>
                <CardHeader className='pb-2'>
                  <CardTitle>Reservation List</CardTitle>
                </CardHeader>
                <CardContent className='max-h-[420px] overflow-y-auto p-0'>
                  {isLoading ? (
                    <div className='flex h-32 items-center justify-center'>
                      <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
                    </div>
                  ) : reservations.length === 0 ? (
                    <div className='flex h-32 items-center justify-center px-4 text-sm text-muted-foreground'>
                      No reservations in this range.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reservations.map((reservation) => {
                          const isCancellingCurrent =
                            cancelReservationMutation.isPending &&
                            cancelReservationMutation.variables
                              ?.reservationId === reservation.id

                          return (
                            <TableRow key={reservation.id}>
                              <TableCell>
                                <div className='flex flex-col gap-0.5'>
                                  <span className='font-medium'>
                                    {reservation.customer_name}
                                  </span>
                                  <span className='text-xs text-muted-foreground'>
                                    {reservation.customer_phone || 'No phone'}
                                  </span>
                                  {reservation.customer_email ? (
                                    <span className='text-xs text-muted-foreground'>
                                      {reservation.customer_email}
                                    </span>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className='inline-flex items-center gap-1 text-sm'>
                                  <Users className='h-3.5 w-3.5 text-muted-foreground' />
                                  {reservation.party_size}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className='flex flex-col gap-0.5'>
                                  <span className='text-sm'>
                                    {format(
                                      new Date(reservation.reservation_date),
                                      'MMM dd, yyyy'
                                    )}
                                  </span>
                                  <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
                                    <Clock3 className='h-3.5 w-3.5' />
                                    {formatTimeRange(reservation)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {reservation.table ? (
                                  <Badge variant='outline'>
                                    Table {reservation.table.table_number}
                                  </Badge>
                                ) : (
                                  <Badge variant='outline'>Unassigned</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getStatusBadgeVariant(
                                    reservation.status
                                  )}
                                  className='capitalize'
                                >
                                  {reservation.status}
                                </Badge>
                              </TableCell>
                              <TableCell className='max-w-[180px] truncate text-sm text-muted-foreground'>
                                {reservation.notes || '--'}
                              </TableCell>
                              <TableCell className='text-right'>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant='ghost'
                                      className='h-8 w-8 p-0 data-[state=open]:bg-muted'
                                    >
                                      <MoreHorizontal className='h-4 w-4' />
                                      <span className='sr-only'>
                                        Open reservation actions
                                      </span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align='end'
                                    className='w-40'
                                  >
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleEventClick(reservation)
                                        }
                                      >
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant='destructive'
                                        disabled={
                                          reservation.status === 'cancelled' ||
                                          isCancellingCurrent
                                        }
                                        onClick={() =>
                                          handleCancelReservation(reservation)
                                        }
                                      >
                                        {isCancellingCurrent
                                          ? 'Cancelling...'
                                          : 'Cancel'}
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className='grid min-h-0 content-start gap-4'>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle>Reservation Analytics</CardTitle>
                </CardHeader>
                <CardContent className='grid gap-2'>
                  <ReservationInsightCard
                    label='Today total reservations'
                    value={todayReservations.length}
                  />
                  <div className='grid grid-cols-2 gap-2'>
                    <ReservationInsightCard
                      label='Pending'
                      value={todayPendingCount}
                    />
                    <ReservationInsightCard
                      label='Confirmed'
                      value={todayConfirmedCount}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <ReservationInsightCard
                      label='Cancelled'
                      value={todayCancelledCount}
                    />
                    <ReservationInsightCard
                      label='Avg party size'
                      value={averagePartySize.toFixed(1)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className='min-h-0 overflow-hidden'>
                <CardHeader className='pb-2'>
                  <CardTitle>Currently Booked Tables</CardTitle>
                </CardHeader>
                <CardContent className='max-h-[350px] overflow-y-auto'>
                  {currentBookedTables.length === 0 ? (
                    <div className='flex h-24 items-center justify-center text-sm text-muted-foreground'>
                      No active booked tables right now.
                    </div>
                  ) : (
                    <div className='flex flex-col gap-2'>
                      {currentBookedTables.map((entry) => (
                        <div
                          key={entry.reservation.id}
                          className='flex items-start justify-between rounded-md border p-3'
                        >
                          <div className='flex flex-col gap-1'>
                            <span className='inline-flex items-center gap-1 text-sm font-medium'>
                              <Table2 className='h-3.5 w-3.5 text-muted-foreground' />
                              Table {entry.reservation.table?.table_number}
                            </span>
                            <span className='text-sm'>
                              {entry.reservation.customer_name}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {entry.reservation.party_size} guests -{' '}
                              {format(entry.start, 'HH:mm')} -{' '}
                              {format(entry.end, 'HH:mm')}
                            </span>
                          </div>
                          <Badge
                            variant={getStatusBadgeVariant(
                              entry.reservation.status
                            )}
                            className={cn('capitalize')}
                          >
                            {entry.reservation.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Main>

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={handleClose}
        reservation={selectedReservation}
        initialDate={selectedDate}
      />
    </>
  )
}
