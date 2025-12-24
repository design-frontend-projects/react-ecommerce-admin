import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProductsDialogs } from './components/products-dialogs'
import { ProductsPrimaryButtons } from './components/products-primary-buttons'
import { ProductsProvider } from './components/products-provider'
import { ProductsTable } from './components/products-table'

export function Products() {
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })

  return (
    <ProductsProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Products</h2>
            <p className='text-muted-foreground'>
              Manage your inventory and product listings.
            </p>
          </div>
          <ProductsPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>Error loading products</div>
        ) : (
          <ProductsTable data={products || []} />
        )}
      </Main>

      <ProductsDialogs />
    </ProductsProvider>
  )
}
