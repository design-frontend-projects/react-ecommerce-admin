import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TransfersAnalytics } from './components/transfers-analytics'
import { TransfersDialogs } from './components/dialogs'
import { TransfersPrimaryButtons } from './components/primary-buttons'
import { TransfersProvider } from './components/provider'
import { TransfersTable } from './components/table'
import { useTransfers } from './hooks/use-stock-transfers'

export function StockTransfers() {
  const { t } = useTranslation()
  const { data: transfers, isLoading, error } = useTransfers()
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filteredTransfers = useMemo(() => {
    if (!transfers) return []
    if (!statusFilter) return transfers
    if (statusFilter === 'pending') {
      return transfers.filter((t) =>
        ['draft', 'approved', 'picked'].includes(t.status)
      )
    }
    if (statusFilter === 'completed') {
      return transfers.filter((t) =>
        ['received', 'completed'].includes(t.status)
      )
    }
    return transfers.filter((t) => t.status === statusFilter)
  }, [transfers, statusFilter])

  return (
    <TransfersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              {t('stockTransfers.title', { defaultValue: 'Stock Transfers' })}
            </h2>
            <p className='text-muted-foreground'>
              {t('stockTransfers.description', {
                defaultValue:
                  'Transfer stock between warehouses, stores, or branches with tracked approval workflows.',
              })}
            </p>
          </div>
          <TransfersPrimaryButtons />
        </div>

        {/* Executive Analytics & KPI Banner */}
        <TransfersAnalytics
          transfers={transfers ?? []}
          activeStatusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>
              {t('stockTransfers.errorLoading', 'Error loading transfers.')}
            </p>
          </div>
        ) : (
          <TransfersTable data={filteredTransfers} />
        )}
      </Main>

      <TransfersDialogs />
    </TransfersProvider>
  )
}

