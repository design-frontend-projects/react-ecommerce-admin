import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContentSection } from '../components/content-section'
import { SettingsErrorBoundary } from '../components/settings-error-boundary'
import { SettingsTabsSkeleton } from '../components/settings-skeleton'
import { BrandingSection } from '../blocks/branding-section'
import { RegionalSection } from '../blocks/regional-section'
import { BusinessSection } from '../blocks/business-section'
import { useSettingsStore } from '../data/store'

export function SettingsSystem() {
  const isLoaded = useSettingsStore((s) => s.isLoaded)

  return (
    <ContentSection
      title='System Settings'
      desc='Manage global application settings including branding, regional preferences, and business rules.'
    >
      <SettingsErrorBoundary>
        {!isLoaded ? (
          <SettingsTabsSkeleton />
        ) : (
          <Tabs defaultValue='branding' className='w-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='branding'>Branding</TabsTrigger>
              <TabsTrigger value='regional'>Regional</TabsTrigger>
              <TabsTrigger value='business'>Business</TabsTrigger>
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
