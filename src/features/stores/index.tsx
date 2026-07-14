import { Loader2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { StoresDialogs } from './components/stores-dialogs'
import { StoresPrimaryButtons } from './components/stores-primary-buttons'
import { StoresProvider } from './components/stores-provider'
import { StoresTable } from './components/stores-table'
import { useStores } from './hooks/use-stores'

export function Stores() {
  const { data: stores, isLoading, error } = useStores()

  return (
    <StoresProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              Stores Management
            </h2>
            <p className='text-muted-foreground'>
              Manage your business locations, operational status, and contact
              details.
            </p>
          </div>
          <StoresPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>
              Error loading stores. Please check your connection and try again.
            </p>
          </div>
        ) : (
          <StoresTable data={stores || []} />
        )}
      </Main>

      <StoresDialogs />
    </StoresProvider>
  )
}
