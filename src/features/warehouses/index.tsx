import { useTranslation } from 'react-i18next'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { WarehousesDialogs } from './components/dialogs'
import { WarehousesPrimaryButtons } from './components/primary-buttons'
import { WarehousesProvider } from './components/provider'
import { WarehousesTable } from './components/table'
import { WarehouseKpiCards } from './components/warehouse-kpi-cards'
import { useWarehouses } from './hooks/use-warehouses'

export function Warehouses() {
  const { t } = useTranslation()
  const { data: warehouses, isLoading, error, refetch } = useWarehouses()

  return (
    <WarehousesProvider>
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
              {t('warehouses.title', 'Warehouses')}
            </h2>
            <p className='text-sm text-muted-foreground mt-1'>
              {t(
                'warehouses.description',
                'Physical storage facilities and their zone → rack → shelf → bin locations.'
              )}
            </p>
          </div>
          <WarehousesPrimaryButtons />
        </div>

        {/* Overview KPI Cards */}
        <WarehouseKpiCards data={warehouses ?? []} />

        {/* Table Content */}
        {isLoading ? (
          <div className='flex min-h-[350px] flex-1 items-center justify-center rounded-lg border bg-card/50'>
            <div className='flex flex-col items-center gap-2'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <span className='text-xs text-muted-foreground'>Loading facilities...</span>
            </div>
          </div>
        ) : error ? (
          <div className='flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-8 text-destructive'>
            <AlertCircle className='h-8 w-8' />
            <p className='font-medium text-sm'>
              {error instanceof Error ? error.message : 'Error loading warehouses.'}
            </p>
            <Button variant='outline' size='sm' onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : (
          <WarehousesTable data={warehouses ?? []} />
        )}
      </Main>

      <WarehousesDialogs />
    </WarehousesProvider>
  )
}
