import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'

export function RestaurantList() {
  return (
    <div className='flex flex-col'>
      {/* Header */}
      <header className='flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/40 px-6'>
        <div className='w-full flex-1'>
          <Search />
        </div>
        <LanguageSwitch />
          <ThemeSwitch />
        <ProfileDropdown />
      </header>

      {/* Main Content */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Restaurants</h2>
            <p className='text-muted-foreground'>
              Manage all restaurants in the system.
            </p>
          </div>
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0'>
          <Card>
            <CardHeader>
              <CardTitle>Restaurants List</CardTitle>
              <CardDescription>
                System-wide overview of registered restaurants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-center py-10'>
                <p className='text-muted-foreground'>Restaurant data will be queried and displayed here.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>
  )
}
