import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CustomerCardsActionDialog } from './components/customer-cards-action-dialog'
import { CustomerCardsDeleteDialog } from './components/customer-cards-delete-dialog'
import { CustomerCardsPrimaryButtons } from './components/customer-cards-primary-buttons'
import CustomerCardsProvider from './components/customer-cards-provider'
import { CustomerCardsTable } from './components/customer-cards-table'
import { useCustomerCards } from './hooks/use-customer-cards'

export default function CustomerCards() {
  const { data: customerCards, isLoading } = useCustomerCards()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <CustomerCardsProvider>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Customer Cards
            </h2>
            <p className='text-muted-foreground'>
              Manage customer payment methods.
            </p>
          </div>
          <CustomerCardsPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <CustomerCardsTable data={customerCards || []} />
        </div>
      </Main>

      <CustomerCardsActionDialog />
      <CustomerCardsDeleteDialog />
    </CustomerCardsProvider>
  )
}
