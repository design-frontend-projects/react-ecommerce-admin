import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useProducts } from '@/features/products/hooks/use-products'
import { RequisitionsDialogs } from './components/dialogs'
import { RequisitionsPrimaryButtons } from './components/primary-buttons'
import { RequisitionsProvider } from './components/provider'
import { PRMetrics } from './components/pr-metrics'
import { RequisitionsTable } from './components/table'
import { useRequisitions } from './hooks/use-purchase-requisitions'

export function PurchaseRequisitions() {
  return (
    <RequisitionsProvider>
      <PurchaseRequisitionsContent />
    </RequisitionsProvider>
  )
}

function PurchaseRequisitionsContent() {
  const { t } = useTranslation()
  const { data: requisitions, isLoading, error } = useRequisitions()

  // Warm products & variants query cache for fast combobox autocomplete
  useProducts()

  return (
    <>
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
              {t('purchaseRequisitions.title')}
            </h2>
            <p className='text-muted-foreground'>
              Draft → submit → approve → convert to purchase order, whether
              raised manually or by the reorder engine.
            </p>
          </div>
          <RequisitionsPrimaryButtons />
        </div>

        {/* Status Metrics Cards */}
        {requisitions && <PRMetrics data={requisitions} />}

        {isLoading ? (
          <div className='flex min-h-[360px] flex-1 items-center justify-center'>
            <Loader2 className='h-9 w-9 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-destructive'>
            <p className='font-medium'>
              Failed to load requisitions: {(error as Error).message}
            </p>
          </div>
        ) : (
          <RequisitionsTable data={requisitions ?? []} />
        )}
      </Main>

      <RequisitionsDialogs />
    </>
  )
}
