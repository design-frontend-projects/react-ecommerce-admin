import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProductsDialogs } from './components/products-dialogs'
import { ProductsPrimaryButtons } from './components/products-primary-buttons'
import { ProductsProvider } from './components/products-provider'
import { ProductsTable } from './components/products-table'
import { useProducts } from './hooks/use-products'

function ProductsContent() {
  const { t } = useTranslation()
  const { data: products = [], isLoading, error } = useProducts()

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
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('products.title')}
            </h2>
            <p className='text-muted-foreground'>
              {t('products.description')}
            </p>
          </div>
          <ProductsPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center min-h-[300px]'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center min-h-[300px] text-destructive'>
            {t('products.errorLoading')}
          </div>
        ) : (
          <ProductsTable data={products} />
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
