import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppTerm } from '../data/queries'

interface TermsViewerProps {
  terms: AppTerm | null
}

export function TermsViewer({ terms }: TermsViewerProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  if (!terms) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <p>{t('terms.noTermsAvailable', 'No terms and conditions are currently available.')}</p>
      </div>
    )
  }

  const title = isArabic ? terms.title_ar : terms.title_en
  const content = isArabic ? terms.content_ar : terms.content_en

  return (
    <Card className="mx-auto w-full max-w-4xl border-none shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">{title || t('terms.title', 'Terms and Conditions')}</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          {t('terms.lastUpdated', 'Last updated:')} {new Date(terms.updated_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
        </p>
      </CardHeader>
      <CardContent className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap leading-relaxed text-foreground">
          {content}
        </div>
      </CardContent>
    </Card>
  )
}
