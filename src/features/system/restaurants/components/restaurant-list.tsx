import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LanguageSwitch } from '@/components/language-switch'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function RestaurantList() {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col'>
      {/* Header */}
      <header className='flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]'>
        <div className='w-full flex-1'>
          <Search />
        </div>
        <LanguageSwitch />
        <ThemeSwitch />
        <ProfileDropdown />
      </header>

      {/* Main Content */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{t('system.restaurants.title')}</h2>
            <p className='text-muted-foreground'>
              {t('system.restaurants.subtitle')}
            </p>
          </div>
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <Card>
            <CardHeader>
              <CardTitle>{t('system.restaurants.cardTitle')}</CardTitle>
              <CardDescription>
                {t('system.restaurants.cardDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='py-10 text-center'>
                <p className='text-muted-foreground'>
                  {t('system.restaurants.emptyNotice')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>
  )
}
