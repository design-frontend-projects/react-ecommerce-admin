import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { LanguageSwitch } from '@/components/language-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { NonRestaurantShipmentsBoard } from '@/features/pos/components/non-restaurant-shipments-board'

export function InventoryShipments() {
  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center gap-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <NonRestaurantShipmentsBoard variant='page' context='inventory' />
      </Main>
    </>
  )
}
