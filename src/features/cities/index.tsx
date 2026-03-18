import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Header } from '@/components/layout/header'
import { CitiesProvider } from './components/cities-provider'
import { CitiesPrimaryButtons } from './components/cities-primary-buttons'
import { CitiesDialogs } from './components/cities-dialogs'
import { CitiesTable } from './components/cities-table'

export default function Cities() {
  return (
    <CitiesProvider>
      <Header>
        <TopNav links={[{ href: '/cities', title: 'Cities', isActive: true }]} />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Cities</h2>
            <p className='text-muted-foreground'>
              Manage cities for your restaurant branches.
            </p>
          </div>
          <CitiesPrimaryButtons />
        </div>
        
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0'>
          <CitiesTable />
        </div>
      </Main>
      
      <CitiesDialogs />
    </CitiesProvider>
  )
}
