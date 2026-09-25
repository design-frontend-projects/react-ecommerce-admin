import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProductsDialogs } from './components/products-dialogs'
import { ProductsPrimaryButtons } from './components/products-primary-buttons'
import {
  ProductsProvider,
  useProductsContext,
} from './components/products-provider'
import { ProductsStats } from './components/products-stats'
import { ProductsTable } from './components/products-table'
import { useProductsStats, useServerProducts } from './hooks/use-products'

function ProductsSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <div className='grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4'>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className='space-y-2 rounded-xl border bg-card p-3.5 shadow-xs sm:p-5'
          >
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-7 w-16 sm:h-8' />
            <Skeleton className='h-3 w-32' />
          </div>
        ))}
      </div>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-9 w-48 sm:w-64' />
          <Skeleton className='h-9 w-24' />
        </div>
        <div className='space-y-3 rounded-lg border bg-card p-4'>
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
  const { quickFilter } = useProductsContext()

  // Server-side query state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [uomId, setUomId] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [productType, setProductType] = useState<string | null>(null)
  const [isActive, setIsActive] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Query server-side paginated products
  const {
    data: queryResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useServerProducts({
    page,
    pageSize,
    search,
    categoryId: categoryId || undefined,
    brandId: brandId || undefined,
    baseUomId: uomId || undefined,
    supplierId: supplierId || undefined,
    productType: productType || undefined,
    isActive:
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    quickFilter,
    sortBy,
    sortOrder,
  })

  // Query overall summary stats for KPI cards
  const { data: summaryStats } = useProductsStats()

  const products = queryResult?.products || []
  const totalCount = queryResult?.totalCount ?? 0

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-2 sm:space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-3.5 px-3 sm:gap-6 sm:px-6'>
        {/* Responsive Header */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl'>
              {t('products.title', { defaultValue: 'Products' })}
            </h2>
            <p className='mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm'>
              {t('products.description', {
                defaultValue:
                  'Manage inventory catalog items, variants, tracking modes, and stock levels.',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2 self-start sm:self-auto'>
            <ProductsPrimaryButtons />
          </div>
        </div>

        {isLoading ? (
          <ProductsSkeleton />
        ) : (
          <>
            <ProductsStats
              data={products}
              totalCount={totalCount}
              stats={summaryStats}
            />
            <ProductsTable
              data={products}
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize)
                setPage(1)
              }}
              search={search}
              onSearchChange={(newSearch) => {
                setSearch(newSearch)
                setPage(1)
              }}
              selectedCategory={categoryId}
              onSelectCategory={(val) => {
                setCategoryId(val)
                setPage(1)
              }}
              selectedBrand={brandId}
              onSelectBrand={(val) => {
                setBrandId(val)
                setPage(1)
              }}
              selectedUom={uomId}
              onSelectUom={(val) => {
                setUomId(val)
                setPage(1)
              }}
              selectedSupplier={supplierId}
              onSelectSupplier={(val) => {
                setSupplierId(val)
                setPage(1)
              }}
              selectedProductType={productType}
              onSelectProductType={(val) => {
                setProductType(val)
                setPage(1)
              }}
              selectedIsActive={isActive}
              onSelectIsActive={(val) => {
                setIsActive(val)
                setPage(1)
              }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(newSortBy, newSortOrder) => {
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
              }}
              isLoading={isLoading}
              isFetching={isFetching}
              error={error}
              onRetry={() => refetch()}
            />
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
