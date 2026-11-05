import { useTranslation } from 'react-i18next'
import { ContentSection } from '../components/content-section'
import { NotificationsForm } from './notifications-form'

export function SettingsNotifications() {
  const { t } = useTranslation()

  return (
    <ContentSection
      title={t('settings.notifications.title', 'Notification Preferences')}
      desc={t(
        'settings.notifications.desc',
        'Configure how you receive notifications, sound chimes, and system alerts.'
      )}
    >
      <NotificationsForm />
    </ContentSection>
  )
}
