// ResPOS Reservations Calendar
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function Reservations() {
  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <CalendarClock className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Reservations</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Reservations Calendar</CardTitle>
          </CardHeader>
          <CardContent className='flex min-h-[400px] items-center justify-center'>
            <p className='text-muted-foreground'>
              Calendar view coming soon. This will show reservations by date
              with table assignments.
            </p>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
