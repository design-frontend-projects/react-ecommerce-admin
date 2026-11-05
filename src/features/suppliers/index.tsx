import { useTranslation } from 'react-i18next'
import { AlertCircle, Loader2, RotateCw } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SuppliersDialogs } from './components/suppliers-dialogs'
import { SuppliersPrimaryButtons } from './components/suppliers-primary-buttons'
import { SuppliersProvider } from './components/suppliers-provider'
import { SuppliersStats } from './components/suppliers-stats'
import { SuppliersTable } from './components/suppliers-table'
import { useSuppliers } from './hooks/use-suppliers'

export function Suppliers() {
  const { t } = useTranslation()
  const { data: suppliers, isLoading, error, refetch } = useSuppliers()

  return (
    <SuppliersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center gap-3 sm:gap-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('suppliers.title', { defaultValue: 'Suppliers' })}
            </h2>
            <p className='text-sm text-muted-foreground mt-0.5'>
              {t('suppliers.description', {
                defaultValue:
                  'Manage vendors, procurement contacts, and purchasing terms.',
              })}
            </p>
          </div>
          <SuppliersPrimaryButtons />
        </div>

        {/* Overview KPI Cards */}
        <SuppliersStats data={suppliers || []} isLoading={isLoading} />

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center p-12'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <Alert variant='destructive' className='my-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>
              {t('common.error', { defaultValue: 'Error loading data' })}
            </AlertTitle>
            <AlertDescription className='flex flex-wrap items-center justify-between gap-2 mt-2'>
              <span>
                {error instanceof Error ? error.message : String(error)}
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => refetch()}
                className='gap-1.5'
              >
                <RotateCw className='h-3.5 w-3.5' />
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <SuppliersTable data={suppliers || []} />
        )}
      </Main>

      <SuppliersDialogs />
    </SuppliersProvider>
  )
}
