import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { TermsEditor } from '@/features/terms/components/terms-editor'
import { TermsViewer } from '@/features/terms/components/terms-viewer'
import { useActiveTerms } from '@/features/terms/data/queries'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  const { t } = useTranslation()
  const { data: terms, isLoading } = useActiveTerms()
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
    <div className='container mx-auto px-4 py-10 md:px-8'>
      <div className='mb-8 flex items-center justify-between'>
        <h1 className='text-3xl font-bold tracking-tight'>
          {t('terms.pageTitle', 'Legal')}
        </h1>
        {isAppOwner && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant='outline'>
            <Pencil className='mr-2 h-4 w-4' />
            {t('terms.editButton', 'Edit Terms')}
          </Button>
        )}
      </div>

      {isEditing ? (
        <TermsEditor
          terms={terms || null}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <TermsViewer terms={terms || null} />
      )}
    </div>
  )
}
