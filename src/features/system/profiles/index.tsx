import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { getColumns } from './components/columns'
import { EditProfileDialog } from './components/edit-profile-dialog'
import { ProfilesTable } from './components/profiles-table'
import { useProfiles, type Profile } from './queries'

export default function SystemProfilesPage() {
  const { t } = useTranslation()
  const { data: profiles, isLoading, error } = useProfiles()
  const [editingProfile, setEditingProfile] = React.useState<Profile | null>(
    null
  )
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile)
    setIsEditDialogOpen(true)
  }

  const columns = React.useMemo(() => getColumns(handleEdit, t), [t])

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-10 w-[250px]' />
        <div className='space-y-4 rounded-md border p-4'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-8 w-full' />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant='destructive'>
        <AlertCircle className='h-4 w-4' />
        <AlertTitle>{t('system.profiles.errorTitle')}</AlertTitle>
        <AlertDescription>
          {t('system.profiles.errorDesc')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>{t('system.profiles.title')}</h2>
          <p className='text-muted-foreground'>
            {t('system.profiles.subtitle')}
          </p>
        </div>
      </div>

      <ProfilesTable columns={columns} data={profiles || []} />

      <EditProfileDialog
        profile={editingProfile}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  )
}
