import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { PrivacyEditor } from '@/features/privacy/components/privacy-editor'
import { PrivacyViewer } from '@/features/privacy/components/privacy-viewer'
import { useActivePrivacy } from '@/features/privacy/data/queries'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  const { t } = useTranslation()
  const { data: privacy, isLoading } = useActivePrivacy()
  const { user } = useUser()
  const [isEditing, setIsEditing] = useState(false)

  const isAppOwner = user?.publicMetadata?.is_owner === true

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='container mx-auto max-w-4xl py-8'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-3xl font-bold tracking-tight'>
          {isEditing ? t('privacy.editTitle') : t('privacy.pageTitle')}
        </h1>
        {isAppOwner && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Pencil className='mr-2 h-4 w-4' />
            {t('privacy.editButton')}
          </Button>
        )}
      </div>

      {isEditing ? (
        <PrivacyEditor
          initialData={privacy || null}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <PrivacyViewer privacy={privacy || null} />
      )}
    </div>
  )
}
