import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ReorderRulesDialogs } from './components/dialogs'
import { ReorderRulesPrimaryButtons } from './components/primary-buttons'
import { ReorderRulesProvider } from './components/provider'
import { ReorderRulesMetricsBanner } from './components/reorder-rules-metrics'
import { ReorderRulesTable } from './components/table'
import type { ReorderRulesSortBy } from './data/schema'
import { useReorderRules } from './hooks/use-reorder-rules'

export function ReorderRules() {
  const { t } = useTranslation()

  // Server-side query state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [storeId, setStoreId] = useState<string | undefined>(undefined)
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined)
  const [sortBy, setSortBy] = useState<ReorderRulesSortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const {
    data: responseData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useReorderRules({
    page,
    pageSize,
    search,
    storeId,
    isActive,
    sortBy,
    sortOrder,
  })

  return (
    <ReorderRulesProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Header Title & Actions */}
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              {t('reorderRules.title', 'Reorder Rules')}
            </h2>
            <p className='text-muted-foreground'>
              {t(
                'reorderRules.description',
                'Per-variant, per-store replenishment thresholds that drive automated reorder checks.'
              )}
            </p>
          </div>
          <ReorderRulesPrimaryButtons />
        </div>

        {/* Executive Replenishment KPI Metrics Banner */}
        <ReorderRulesMetricsBanner
          metrics={responseData?.metrics}
          isLoading={isLoading}
          selectedStatus={isActive}
          onStatusSelect={(status) => {
            setIsActive(status)
            setPage(1)
          }}
        />

        {/* Content Area: Table / Error */}
        {error ? (
          <div className='flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'>
            <p className='font-medium'>
              {t('reorderRules.errorLoading', 'Error loading reorder rules.')}
            </p>
            <Button variant='outline' size='sm' onClick={() => void refetch()}>
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        ) : (
          <ReorderRulesTable
            data={responseData?.items ?? []}
            total={responseData?.total ?? 0}
            page={responseData?.page ?? page}
            pageSize={responseData?.pageSize ?? pageSize}
            totalPages={responseData?.totalPages ?? 1}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setPage(1)
            }}
            search={search}
            onSearchChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            storeId={storeId}
            onStoreChange={(val) => {
              setStoreId(val)
              setPage(1)
            }}
            isActive={isActive}
            onIsActiveChange={(val) => {
              setIsActive(val)
              setPage(1)
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(sBy, sOrd) => {
              setSortBy(sBy ?? 'created_at')
              setSortOrder(sOrd ?? 'desc')
            }}
            isLoading={isLoading || isFetching}
          />
        )}
      </Main>

      <ReorderRulesDialogs />
    </ReorderRulesProvider>
  )
}
