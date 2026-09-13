import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  useFinancialTransactions,
  useFinancialTransactionStats,
} from '../hooks/use-financial-transactions'
import { TransactionsDialogs } from './transactions-dialogs'
import { TransactionsKpiStrip } from './transactions-kpi-strip'
import { TransactionsPrimaryButtons } from './transactions-primary-buttons'
import {
  TransactionsProvider,
  useTransactionsContext,
} from './transactions-provider'
import { TransactionsTable } from './transactions-table'

function TransactionsContent() {
  const { t } = useTranslation()
  const {
    typeFilter,
    statusFilter,
    currencyFilter,
    search,
    page,
  } = useTransactionsContext()

  const { data: stats, isLoading: isLoadingStats } =
    useFinancialTransactionStats()

  const {
    data,
    isLoading: isLoadingList,
    error,
  } = useFinancialTransactions({
    type: typeFilter === '__all__' ? undefined : typeFilter,
    status: statusFilter === '__all__' ? undefined : statusFilter,
    currency: currencyFilter === '__all__' ? undefined : currencyFilter,
    search: search.trim() || undefined,
    page,
    pageSize: 20,
  })

  const items = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  return (
    <div className='flex flex-1 flex-col'>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Title and Top Actions */}
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              {t('transactions.title', 'Financial Transactions')}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {t(
                'transactions.description',
                'Comprehensive monetary ledger: sales, payments, purchases, expenses, and linked refunds.'
              )}
            </p>
          </div>
          <TransactionsPrimaryButtons />
        </div>

        {/* Executive KPI Overview Strip */}
        <TransactionsKpiStrip stats={stats} isLoading={isLoadingStats} />

        {/* Error Notice */}
        {error && (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'>
            Error loading financial ledger. Please refresh or verify your connection.
          </div>
        )}

        {/* Transactions Table */}
        <TransactionsTable
          data={items}
          total={total}
          page={page}
          pageSize={20}
          totalPages={totalPages}
          isLoading={isLoadingList}
        />
      </Main>

      <TransactionsDialogs />
    </div>
  )
}

export function Transactions() {
  return (
    <TransactionsProvider>
      <TransactionsContent />
    </TransactionsProvider>
  )
}
