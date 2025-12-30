import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { InventoryDialogs } from './components/inventory-dialogs'
import { InventoryPrimaryButtons } from './components/inventory-primary-buttons'
import { InventoryProvider } from './components/inventory-provider'
import { InventoryTable } from './components/inventory-table'

export function Inventory() {
  const {
    data: inventory,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, products(name)')
        .order('inventory_id', { ascending: false })

      if (error) throw error
      // Flatten the structure for the table if needed, or handle in columns
      // Currently handling in columns: row.original.products?.name
      return data
    },
  })

  return (
    <InventoryProvider>
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
            <h2 className='text-2xl font-bold tracking-tight'>Inventory</h2>
            <p className='text-muted-foreground'>
              Manage your product inventory levels and locations.
            </p>
          </div>
          <InventoryPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>Error loading inventory</div>
        ) : (
          <InventoryTable data={inventory || []} />
        )}
      </Main>

      <InventoryDialogs />
    </InventoryProvider>
  )
}
