import { useTranslation } from 'react-i18next'
import { Loader2, Percent } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TaxDialogs } from './components/tax-rates-dialogs'
import { TaxPrimaryButtons } from './components/tax-rates-primary-buttons'
import { TaxProvider, useTaxContext } from './components/tax-rates-provider'
import { TaxTable } from './components/tax-rates-table'
import { TaxRatesKpiCards } from './components/tax-rates-kpi-cards'
import { TaxRatesFilters } from './components/tax-rates-filters'
import { useTaxRates, useTaxRateStats } from './hooks/use-tax-rates'

function TaxRatesContent() {
  const { t } = useTranslation()
  const { filters } = useTaxContext()
  const { data: taxRates = [], isLoading, error } = useTaxRates(filters)
  const stats = useTaxRateStats(taxRates)

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6 p-4 md:p-6'>
        {/* Title and Action Header */}
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Percent className='h-4 w-4' />
              </div>
              <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                {t('taxRates.title', 'Tax Rates & Rules')}
              </h2>
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground'>
              {t(
                'taxRates.subtitle',
                'Manage VAT, regional sales taxes, and inclusive pricing across countries and channels.'
              )}
            </p>
          </div>
          <TaxPrimaryButtons />
        </div>

        {/* Analytics & KPI Cards */}
        <TaxRatesKpiCards stats={stats} isLoading={isLoading} />

        {/* Filters Toolbar */}
        <TaxRatesFilters />

        {/* Table View */}
        <div className='flex-1'>
          {isLoading ? (
            <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card/50'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <p className='text-xs text-muted-foreground'>
                {t('taxRates.loading', 'Loading tax rates...')}
              </p>
            </div>
          ) : error ? (
            <div className='flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive'>
              <p className='text-sm font-semibold'>
                {t('taxRates.errorLoading', 'Failed to load tax rates')}
              </p>
              <p className='text-xs text-muted-foreground'>
                {error instanceof Error
                  ? error.message
                  : t('common.unknownError', {
                      defaultValue: 'Unknown database error',
                    })}
              </p>
            </div>
          ) : (
            <TaxTable data={taxRates} />
          )}
        </div>
      </Main>

      <TaxDialogs />
    </>
  )
}

export function TaxRates() {
  return (
    <TaxProvider>
      <TaxRatesContent />
    </TaxProvider>
  )
}

export default TaxRates
