import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PromotionsDialogs } from './components/promotions-dialogs'
import { PromotionsPrimaryButtons } from './components/promotions-primary-buttons'
import { PromotionsProvider } from './components/promotions-provider'
import { PromotionsTable } from './components/promotions-table'
import { usePromotions } from './hooks/use-promotions'

export function Promotions() {
  const { data: promotions, isLoading, error } = usePromotions()

  return (
    <PromotionsProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Promotions</h2>
            <p className='text-muted-foreground'>
              Manage discounts and special offers.
            </p>
          </div>
          <PromotionsPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>Error loading promotions</div>
        ) : (
          <PromotionsTable data={promotions || []} />
        )}
      </Main>

      <PromotionsDialogs />
    </PromotionsProvider>
  )
}
