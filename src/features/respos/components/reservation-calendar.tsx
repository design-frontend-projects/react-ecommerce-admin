import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Card, CardContent } from '@/components/ui/card'
import type { ResReservation, ResTable } from '../types'

interface ReservationCalendarProps {
  reservations: Array<ResReservation & { table: ResTable }>
  onEventClick: (reservation: ResReservation) => void
  onDateSelect: (start: Date) => void
}

export function ReservationCalendar({
  reservations,
  onEventClick,
  onDateSelect,
}: ReservationCalendarProps) {
  // Transform reservations to events
  const events = reservations.map((res) => ({
    id: res.id,
    title: `${res.customer_name} (${res.party_size}p)${
      res.table ? ` - T${res.table.table_number}` : ''
    }`,
    start: `${res.reservation_date}T${res.reservation_time}`,
    end: new Date(
      new Date(`${res.reservation_date}T${res.reservation_time}`).getTime() +
        res.duration_minutes * 60000
    ).toISOString(),
    backgroundColor:
      res.status === 'confirmed'
        ? '#10b981' // emerald-500
        : res.status === 'completed'
          ? '#6b7280' // gray-500
          : res.status === 'cancelled'
            ? '#ef4444' // red-500
            : '#f59e0b', // amber-500
    borderColor: 'transparent',
    extendedProps: {
      reservation: res,
    },
  }))

  return (
    <Card className='h-full overflow-hidden'>
      <CardContent className='h-full overflow-hidden p-0 [&_.fc]:h-full [&_.fc-toolbar-title]:text-xl [&_.fc-toolbar-title]:font-bold'>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView='timeGridWeek'
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          eventClick={(info) => {
            onEventClick(info.event.extendedProps.reservation)
          }}
          dateClick={(info) => {
            onDateSelect(info.date)
          }}
          selectable={true}
          select={(info) => {
            onDateSelect(info.start)
          }}
          height='100%'
          allDaySlot={false}
          slotMinTime='08:00:00'
          slotMaxTime='24:00:00'
          nowIndicator={true}
          stickyHeaderDates={true}
        />
      </CardContent>
    </Card>
  )
}
