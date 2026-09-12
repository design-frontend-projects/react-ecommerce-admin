import { AlertCircle, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProductsDialogs } from './components/products-dialogs'
import { ProductsPrimaryButtons } from './components/products-primary-buttons'
import { ProductsProvider } from './components/products-provider'
import { ProductsStats } from './components/products-stats'
import { ProductsTable } from './components/products-table'
import { useProducts } from './hooks/use-products'

function ProductsSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className='rounded-xl border p-4 sm:p-5 bg-card shadow-xs space-y-2'
          >
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

function ProductsContent() {
  const { t } = useTranslation()
  const { data: products = [], isLoading, error, refetch } = useProducts()

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
            <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
              {t('products.title', { defaultValue: 'Products' })}
            </h2>
            <p className='text-sm text-muted-foreground'>
              {t('products.description', {
                defaultValue:
                  'Manage inventory catalog items, variants, tracking modes, and stock levels.',
              })}
            </p>
          </div>
          <ProductsPrimaryButtons />
        </div>

        {isLoading ? (
          <ProductsSkeleton />
        ) : error ? (
          <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-destructive text-center'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10'>
              <AlertCircle className='h-6 w-6' />
            </div>
            <div className='space-y-1'>
              <h3 className='font-semibold text-base'>
                {t('products.errorLoading', {
                  defaultValue: 'Failed to load products',
                })}
              </h3>
              <p className='text-xs text-muted-foreground max-w-sm'>
                {error instanceof Error
                  ? error.message
                  : 'An unexpected error occurred while loading products.'}
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              className='mt-2 gap-1.5'
            >
              <RotateCcw className='h-3.5 w-3.5' />
              {t('common.tryAgain', { defaultValue: 'Try Again' })}
            </Button>
          </div>
        ) : (
          <>
            <ProductsStats data={products} />
            <ProductsTable data={products} />
          </>
        )}
      </Main>

      <ProductsDialogs />
    </>
  )
}

export function Products() {
  return (
    <ProductsProvider>
      <ProductsContent />
    </ProductsProvider>
  )
}

export default Products
