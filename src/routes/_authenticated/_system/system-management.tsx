import { createFileRoute } from '@tanstack/react-router'
import { useTranslation, Trans } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'

const SystemManagementPage = () => {
  const { t } = useTranslation()
  const { profile } = useSystemOwner()

  const adminName = profile?.first_name || profile?.email || t('system.systemManagement.defaultAdmin')

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold tracking-tight'>{t('system.systemManagement.title')}</h1>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('system.systemManagement.totalStores')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>0</div>
            <p className='text-xs text-muted-foreground'>{t('system.systemManagement.acrossPlatform')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('system.systemManagement.totalUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>0</div>
            <p className='text-xs text-muted-foreground'>{t('system.systemManagement.registeredUsers')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('system.systemManagement.globalConfigTitle')}</CardTitle>
          <CardDescription>
            {t('system.systemManagement.globalConfigDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <p>
              <Trans
                i18nKey='system.systemManagement.welcome'
                values={{ name: adminName }}
              />
            </p>
            <p className='text-sm text-muted-foreground italic'>
              {t('system.systemManagement.systemOwnersOnly')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute(
  '/_authenticated/_system/system-management'
)({
  component: SystemManagementPage,
})
