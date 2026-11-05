import { useTranslation } from 'react-i18next'
import { Outlet } from '@tanstack/react-router'
import {
  Monitor,
  Bell,
  Palette,
  Wrench,
  UserCog,
  Settings2,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

export function Settings() {
  const { t } = useTranslation()

  const sidebarNavItems = [
    {
      title: t('settings.nav.profile', t('sidebar.profile', 'Profile')),
      href: '/settings',
      icon: <UserCog size={18} />,
    },
    {
      title: t('settings.nav.account', t('sidebar.account', 'Account & Security')),
      href: '/settings/account',
      icon: <Wrench size={18} />,
    },
    {
      title: t('settings.nav.appearance', t('sidebar.appearance', 'Appearance')),
      href: '/settings/appearance',
      icon: <Palette size={18} />,
    },
    {
      title: t('settings.nav.notifications', t('sidebar.notifications', 'Notifications')),
      href: '/settings/notifications',
      icon: <Bell size={18} />,
    },
    {
      title: t('settings.nav.display', t('sidebar.display', 'Display & POS')),
      href: '/settings/display',
      icon: <Monitor size={18} />,
    },
    {
      title: t('settings.nav.system', t('sidebar.systemSettings', 'System Settings')),
      href: '/settings/system',
      icon: <Settings2 size={18} />,
    },
  ]

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ms-auto flex items-center gap-2 sm:gap-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('settings.title', 'Settings')}
          </h1>
          <p className='text-muted-foreground'>
            {t(
              'settings.description',
              'Manage your workspace, account preferences, system settings, and business rules.'
            )}
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:gap-10'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
