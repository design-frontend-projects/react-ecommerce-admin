import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { useActiveTerms } from '@/features/terms/data/queries'
import { TermsViewer } from '@/features/terms/components/terms-viewer'
import { TermsEditor } from '@/features/terms/components/terms-editor'
import { useUser } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  const { t } = useTranslation()
  const { data: terms, isLoading } = useActiveTerms()
  const { profile } = useUser()
  const [isEditing, setIsEditing] = useState(false)

  const isAppOwner = profile?.is_owner === true

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('terms.pageTitle', 'Legal')}</h1>
        {isAppOwner && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
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
