import { useTranslation } from 'react-i18next'
import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  const { t } = useTranslation()

  return (
    <ContentSection
      title={t('settings.account.title', 'Account Security')}
      desc={t(
        'settings.account.description',
        'Update your account settings and manage security credentials.'
      )}
    >
      <AccountForm />
    </ContentSection>
  )
}
