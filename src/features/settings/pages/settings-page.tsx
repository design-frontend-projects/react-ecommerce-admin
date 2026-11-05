import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrandingSection } from '../blocks/branding-section'
import { BusinessSection } from '../blocks/business-section'
import { RegionalSection } from '../blocks/regional-section'
import { ContentSection } from '../components/content-section'
import { SettingsErrorBoundary } from '../components/settings-error-boundary'
import { SettingsTabsSkeleton } from '../components/settings-skeleton'
import { useSettingsStore } from '../data/store'

export function SettingsSystem() {
  const { t } = useTranslation()
  const isLoaded = useSettingsStore((s) => s.isLoaded)

  return (
    <ContentSection
      title={t('settings.system.title', 'System & Business Rules')}
      desc={t(
        'settings.system.desc',
        'Manage global application settings including branding, regional preferences, and business rules.'
      )}
    >
      <SettingsErrorBoundary>
        {!isLoaded ? (
          <SettingsTabsSkeleton />
        ) : (
          <Tabs defaultValue='branding' className='w-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='branding'>
                {t('settings.system.tabs.branding', 'Branding')}
              </TabsTrigger>
              <TabsTrigger value='regional'>
                {t('settings.system.tabs.regional', 'Regional')}
              </TabsTrigger>
              <TabsTrigger value='business'>
                {t('settings.system.tabs.business', 'Business & POS')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value='branding' className='mt-6'>
              <BrandingSection />
            </TabsContent>
            <TabsContent value='regional' className='mt-6'>
              <RegionalSection />
            </TabsContent>
            <TabsContent value='business' className='mt-6'>
              <BusinessSection />
            </TabsContent>
          </Tabs>
        )}
      </SettingsErrorBoundary>
    </ContentSection>
  )
}
