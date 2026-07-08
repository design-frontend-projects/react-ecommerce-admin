import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { AdjustmentsProvider } from './components/provider'
import { AdjustmentsPrimaryButtons } from './components/primary-buttons'
import { AdjustmentsTable } from './components/table'
import { AdjustmentsDialogs } from './components/dialogs'
import { useAdjustments } from './hooks/use-stock-adjustments'

export function StockAdjustments() {
  const { data: adjustments, isLoading, error } = useAdjustments()

  return (
    <AdjustmentsProvider>
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
              Stock Adjustments
            </h2>
            <p className='text-muted-foreground'>
              Manual corrections, damaged/expired write-offs, and stocktake
              reconciliation.
            </p>
          </div>
          <AdjustmentsPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>Error loading adjustments.</p>
          </div>
        ) : (
          <AdjustmentsTable data={adjustments ?? []} />
        )}
      </Main>

      <AdjustmentsDialogs />
    </AdjustmentsProvider>
  )
}
