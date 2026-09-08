import { useTranslation } from 'react-i18next'
import { CheckCircle2, Globe, Loader2, Radio, XCircle } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChannelsDialogs } from './components/channels-dialogs'
import { ChannelsPrimaryButtons } from './components/channels-primary-buttons'
import { ChannelsProvider } from './components/channels-provider'
import { ChannelsTable } from './components/channels-table'
import { useChannels } from './hooks/use-channels'

export function Channels() {
  const { t } = useTranslation()
  const { data: channels, isLoading, error } = useChannels()

  const items = channels || []
  const totalCount = items.length
  const activeCount = items.filter((c) => c.is_active).length
  const inactiveCount = totalCount - activeCount

  return (
    <ChannelsProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Page Title & Primary Actions */}
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Radio className='h-5 w-5' />
              </div>
              <h2 className='text-2xl font-bold tracking-tight'>
                {t('channels.title', { defaultValue: 'Sales Channels' })}
              </h2>
            </div>
            <p className='text-sm text-muted-foreground mt-1'>
              {t('channels.description', {
                defaultValue:
                  'Manage and configure sales, order, and distribution channels (e.g. POS, Online Store, Mobile App, Aggregators).',
              })}
            </p>
          </div>
          <ChannelsPrimaryButtons />
        </div>

        {/* KPI Metrics */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card className='gap-2 py-4'>
            <CardHeader className='flex flex-row items-center justify-between pb-1'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {t('channels.metrics.total', { defaultValue: 'Total Channels' })}
              </CardTitle>
              <Globe className='h-4 w-4 text-primary' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{totalCount}</div>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {t('channels.metrics.totalSubtitle', {
                  defaultValue: 'Configured distribution endpoints',
                })}
              </p>
            </CardContent>
          </Card>

          <Card className='gap-2 py-4'>
            <CardHeader className='flex flex-row items-center justify-between pb-1'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {t('channels.metrics.active', { defaultValue: 'Active Channels' })}
              </CardTitle>
              <CheckCircle2 className='h-4 w-4 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                {activeCount}
              </div>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {t('channels.metrics.activeSubtitle', {
                  defaultValue: 'Ready for POS & Order capture',
                })}
              </p>
            </CardContent>
          </Card>

          <Card className='gap-2 py-4'>
            <CardHeader className='flex flex-row items-center justify-between pb-1'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {t('channels.metrics.inactive', { defaultValue: 'Inactive Channels' })}
              </CardTitle>
              <XCircle className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-muted-foreground'>
                {inactiveCount}
              </div>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {t('channels.metrics.inactiveSubtitle', {
                  defaultValue: 'Disabled / archived channels',
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table / Loading / Error State */}
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center min-h-[300px]'>
            <div className='flex flex-col items-center gap-2'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <p className='text-sm text-muted-foreground'>
                {t('channels.loading', { defaultValue: 'Loading sales channels...' })}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className='rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive'>
            <p className='font-semibold'>
              {t('channels.errorLoading', {
                defaultValue: 'Failed to load sales channels.',
              })}
            </p>
            <p className='text-xs mt-1 text-muted-foreground'>
              {error instanceof Error ? error.message : 'Unknown error occurred.'}
            </p>
          </div>
        ) : (
          <ChannelsTable data={items} />
        )}
      </Main>

      <ChannelsDialogs />
    </ChannelsProvider>
  )
}
