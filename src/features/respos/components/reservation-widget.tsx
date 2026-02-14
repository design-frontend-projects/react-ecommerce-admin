import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { CalendarClock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useReservations } from '../api/queries'

export function ReservationWidget() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: reservations = [], isLoading } = useReservations({
    date: today,
  })

  // Filter for upcoming (not completed/cancelled)
  const upcomingReservations = reservations
    .filter((r) => r.status === 'pending' || r.status === 'confirmed')
    .slice(0, 5)

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>
          Today's Reservations
        </CardTitle>
        <CalendarClock className='h-4 w-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='flex h-[100px] items-center justify-center'>
            <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
          </div>
        ) : upcomingReservations.length > 0 ? (
          <div className='space-y-4 pt-2'>
            {upcomingReservations.map((res) => (
              <div
                key={res.id}
                className='flex items-center justify-between border-b pb-2 last:border-0 last:pb-0'
              >
                <div className='space-y-1'>
                  <p className='text-sm leading-none font-medium'>
                    {res.customer_name}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {res.reservation_time} • {res.duration_minutes} min
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                    <Users className='h-3 w-3' />
                    {res.party_size}
                  </div>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      res.status === 'confirmed'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='flex h-[100px] items-center justify-center text-sm text-muted-foreground'>
            No upcoming reservations today
          </div>
        )}
        <div className='mt-4'>
          <Button asChild variant='outline' className='w-full'>
            <Link to='/respos/reservations'>View Calendar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
