import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Loader2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { BatchMetrics } from './components/batch-metrics'
import { BatchCreateDialog } from './components/batch-create-dialog'
import { BatchesPrimaryButtons } from './components/primary-buttons'
import { BatchesTable } from './components/table'
import { useBatches } from './hooks/use-batches'

export function Batches() {
  const { t } = useTranslation()
  const { data: batches = [], isLoading, error } = useBatches()
  const [createOpen, setCreateOpen] = useState(false)

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
        {/* Page Header */}
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              {t('batches.title', 'Batch & Lot Tracking')}
            </h2>
            <p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
              {t(
                'batches.subtitle',
                'Lot-tracked inventory with shelf-life, supplier trace, and bin-level location detail.'
              )}
            </p>
          </div>
          <BatchesPrimaryButtons
            onAddBatch={() => setCreateOpen(true)}
            batches={batches}
          />
        </div>

        {/* KPI Metrics */}
        <BatchMetrics batches={batches} />

        {/* Content State */}
        {isLoading ? (
          <div className='flex min-h-[350px] flex-1 flex-col items-center justify-center gap-2'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>
              {t('common.loading', 'Loading data...')}
            </p>
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-destructive'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5' />
              <p className='font-medium text-sm'>
                {t('batches.errorLoading', 'Error loading batches.')}
              </p>
            </div>
          </div>
        ) : (
          <BatchesTable data={batches} />
        )}

        {/* Add Batch Modal */}
        <BatchCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      </Main>
    </>
  )
}
