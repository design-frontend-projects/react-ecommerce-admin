import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitch } from '@/components/language-switch'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function SystemDashboard() {
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
            <h2 className='text-2xl font-bold tracking-tight'>{t('system.dashboard.title')}</h2>
            <p className='text-muted-foreground'>
              {t('system.dashboard.subtitle')}
            </p>
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                {t('system.dashboard.totalRestaurants')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>+20</div>
              <p className='text-xs text-muted-foreground'>
                {t('system.dashboard.fromLastMonth', { change: '+2' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                {t('system.dashboard.activeUsers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>+2350</div>
              <p className='text-xs text-muted-foreground'>
                {t('system.dashboard.fromLastMonth', { change: '+180' })}
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>
    </div>
  )
}
