import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type PrivacyPolicy } from '../data/queries'

interface PrivacyViewerProps {
  privacy: PrivacyPolicy | null
}

export function PrivacyViewer({ privacy }: PrivacyViewerProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  if (!privacy) {
    return (
      <div className='flex h-64 items-center justify-center rounded-lg border border-dashed'>
        <p className='text-muted-foreground'>
          {t('privacy.noPrivacyAvailable')}
        </p>
      </div>
    )
  }

  const title = isRtl ? privacy.title_ar : privacy.title_en
  const content = isRtl ? privacy.content_ar : privacy.content_en

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-2xl'>
          {title || t('privacy.title')}
        </CardTitle>
        <div className='text-sm text-muted-foreground'>
          {t('privacy.lastUpdated')}{' '}
          {new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
            dateStyle: 'medium',
          }).format(new Date(privacy.updated_at))}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className='text-sm leading-relaxed whitespace-pre-wrap'
          style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        >
          {content}
        </div>
      </CardContent>
    </Card>
  )
}
