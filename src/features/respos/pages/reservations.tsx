import { useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useReservations } from '../api/queries'
import { ReservationCalendar } from '../components/reservation-calendar'
import { ReservationDialog } from '../components/reservation-dialog'
import { useResposRealtime } from '../hooks/use-realtime'
import type { ResReservation } from '../types'

export function Reservations() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] =
    useState<ResReservation | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Real-time updates
  useResposRealtime({
    tables: ['res_reservations', 'res_tables'],
  })

  const { data: reservations = [], isLoading } = useReservations()

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

  const handleClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedReservation(null)
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <CalendarClock className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Reservations</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <Button onClick={handleCreateNew} size='sm' className='gap-2'>
            <Plus className='h-4 w-4' />
            New Reservation
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className='flex h-full flex-col gap-4 p-4'>
          <Card className='min-h-0 flex-1 overflow-hidden'>
            <CardHeader className='pb-2'>
              <CardTitle>Management</CardTitle>
            </CardHeader>
            <CardContent className='h-[calc(100%-4rem)] overflow-hidden p-0'>
              {isLoading ? (
                <div className='flex h-full items-center justify-center'>
                  <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
                </div>
              ) : (
                <div className='h-full overflow-hidden p-2'>
                  <ReservationCalendar
                    reservations={reservations}
                    onEventClick={handleEventClick}
                    onDateSelect={handleDateSelect}
                  />
                </div>
              )}
            </CardContent>
          </Card>
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
