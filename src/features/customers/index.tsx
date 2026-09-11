import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CustomersDialogs } from './components/customers-dialogs'
import { CustomersPrimaryButtons } from './components/customers-primary-buttons'
import { CustomersProvider } from './components/customers-provider'
import { CustomersTable } from './components/customers-table'
import { CustomerKpiCards } from './components/customer-kpi-cards'
import { useCustomers } from './hooks/use-customers'

function CustomersSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className='rounded-xl border p-4 sm:p-5 bg-card shadow-xs space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-16' />
            <Skeleton className='h-3 w-32' />
          </div>
        ))}
      </div>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-9 w-64' />
          <Skeleton className='h-9 w-24' />
        </div>
        <div className='rounded-lg border bg-card p-4 space-y-3'>
          <Skeleton className='h-10 w-full' />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      </div>
    </div>
  )
}

function CustomersContent() {
  const { t } = useTranslation()
  const { data: customers, isLoading, error, refetch } = useCustomers()

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='flex flex-wrap items-end justify-between gap-3'
      >
        <div className='space-y-1'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs'>
              <Users className='h-5 w-5' />
            </div>
            <h2 className='bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent'>
              {t('customers.title', 'Customers')}
            </h2>
          </div>
          <p className='text-xs sm:text-sm text-muted-foreground max-w-2xl'>
            {t(
              'customers.description',
              'Manage customer profiles, contact info, group memberships, and loyalty points.'
            )}
          </p>
        </div>

        <CustomersPrimaryButtons />
      </motion.div>

      {/* Body Area */}
      {isLoading ? (
        <CustomersSkeleton />
      ) : error ? (
        <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-destructive text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10'>
            <AlertCircle className='h-6 w-6' />
          </div>
          <div className='space-y-1'>
            <h3 className='font-semibold text-base'>
              {t('customers.errorLoading', 'Failed to load customers')}
            </h3>
            <p className='text-xs text-muted-foreground max-w-sm'>
              {error instanceof Error ? error.message : 'An unexpected error occurred.'}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='mt-2 gap-1.5'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            {t('common.tryAgain', 'Try Again')}
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className='flex flex-1 flex-col gap-4 sm:gap-6'
        >
          {/* Overview KPI Cards */}
          <CustomerKpiCards data={customers ?? []} />

          {/* Table */}
          <CustomersTable data={customers ?? []} />
        </motion.div>
      )}

      <CustomersDialogs />
    </Main>
  )
}

export function Customers() {
  return (
    <CustomersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <CustomersContent />
    </CustomersProvider>
  )
}
export default Customers
