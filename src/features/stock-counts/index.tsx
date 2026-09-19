import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CountsDialogs } from './components/dialogs'
import { CountsPrimaryButtons } from './components/primary-buttons'
import { CountsProvider } from './components/provider'
import { CountsStats } from './components/stats'
import { CountsTable } from './components/table'
import { useCounts } from './hooks/use-stock-counts'

export function StockCounts() {
  const { t } = useTranslation()
  const { data: counts, isLoading, error } = useCounts()

  return (
    <CountsProvider>
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
              {t('stockCounts.title', 'Stock Counts & Audits')}
            </h2>
            <p className='text-xs sm:text-sm text-muted-foreground'>
              {t(
                'stockCounts.description',
                'Full warehouse and cycle counts: freeze snapshot quantities, record physical items, audit variances, and post stock adjustments.'
              )}
            </p>
          </div>
          <CountsPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>{t('stockCounts.errorLoading', 'Error loading stock counts.')}</p>
          </div>
        ) : (
          <div className='flex flex-col gap-5'>
            <CountsStats data={counts ?? []} />
            <CountsTable data={counts ?? []} />
          </div>
        )}
      </Main>

      <CountsDialogs />
    </CountsProvider>
  )
}
