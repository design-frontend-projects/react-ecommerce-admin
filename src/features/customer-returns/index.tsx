import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CustomerReturnCreateDialog } from './components/create-dialog'
import { CustomerReturnsTable } from './components/table'
import { useCustomerReturns } from './hooks/use-customer-returns'

export function CustomerReturns() {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: returns = [], isLoading, error } = useCustomerReturns()

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
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>{t('customerReturns.title')}</h2>
            <p className='text-muted-foreground'>
              Process returned stock, inspect product condition (good vs damaged), and restock warehouses.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className='gap-2 shadow-sm'>
            <Plus className='h-4 w-4' />
            New Customer Return
          </Button>
        </div>

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>Error loading customer returns.</p>
          </div>
        ) : (
          <CustomerReturnsTable data={returns} />
        )}

        <CustomerReturnCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </Main>
    </>
  )
}
