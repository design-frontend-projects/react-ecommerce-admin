import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function SystemDashboard() {
  return (
    <div className='flex flex-col'>
      {/* Header */}
      <header className='flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/40 px-6'>
        <div className='w-full flex-1'>
          <Search />
        </div>
        <ThemeSwitch />
        <ProfileDropdown />
      </header>

      {/* Main Content */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Dashboard</h2>
            <p className='text-muted-foreground'>
              System-wide overview and metrics.
            </p>
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Restaurants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>+20</div>
              <p className='text-xs text-muted-foreground'>
                +2 from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>+2350</div>
              <p className='text-xs text-muted-foreground'>
                +180 from last month
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>
  )
}
