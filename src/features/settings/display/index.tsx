import { useTranslation } from 'react-i18next'
import { ContentSection } from '../components/content-section'
import { DisplayForm } from './display-form'

export function SettingsDisplay() {
  const { t } = useTranslation()

  return (
    <ContentSection
      title={t('settings.display.title', 'Display & POS Preferences')}
      desc={t(
        'settings.display.desc',
        'Turn items on or off to control what is displayed in the app and POS register.'
      )}
    >
      <DisplayForm />
    </ContentSection>
  )
}
