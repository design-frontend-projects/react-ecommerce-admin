import * as React from 'react'
import { Settings2, Sun, Moon, Monitor, Type, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSidebar } from '../ui/sidebar'

export function ConfigDrawer() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { sidebarType, setSidebarType } = useSidebar()
  const [font, setFont] = React.useState('Inter')

  const fonts = ['Inter', 'Roboto', 'Outfit', 'Cairo']
  const languages = [
    { code: 'en', label: 'English', dir: 'ltr' },
    { code: 'ar', label: 'العربية', dir: 'rtl' },
  ]

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    document.documentElement.dir =
      languages.find((l) => l.code === lng)?.dir || 'ltr'
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='ghost' size='icon' className='h-9 w-9'>
          <Settings2 className='h-5 w-5' />
          <span className='sr-only'>{t('configDrawer.title')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className='w-[300px] sm:w-[400px]'>
        <SheetHeader className='border-b pb-6'>
          <div className='flex items-center justify-between'>
            <SheetTitle className='text-xl font-bold'>
              {t('configDrawer.title')}
            </SheetTitle>
          </div>
          <SheetDescription>{t('configDrawer.description')}</SheetDescription>
        </SheetHeader>

        <div className='scrollbar-hide max-h-[calc(100vh-120px)] space-y-8 overflow-y-auto py-6'>
          {/* Theme Section */}
          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase'>
              <Sun className='h-4 w-4' />
              {t('configDrawer.theme')}
            </div>
            <div className='grid grid-cols-3 gap-2'>
              {[
                { name: 'light', icon: Sun },
                { name: 'dark', icon: Moon },
                { name: 'system', icon: Monitor },
              ].map((item) => (
                <Button
                  key={item.name}
                  variant={theme === item.name ? 'default' : 'outline'}
                  className='h-12 flex-col gap-1 px-1'
                  onClick={() => setTheme(item.name as any)}
                >
                  <item.icon className='h-4 w-4' />
                  <span className='text-[10px] capitalize'>{item.name}</span>
                </Button>
              ))}
            </div>
          </section>

          {/* Language Section */}
          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase'>
              <Languages className='h-4 w-4' />
              {t('configDrawer.language')}
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {languages.map((lang) => (
                <Button
                  key={lang.code}
                  variant={i18n.language === lang.code ? 'default' : 'outline'}
                  className='h-10'
                  onClick={() => changeLanguage(lang.code)}
                >
                  {lang.label}
                </Button>
              ))}
            </div>
          </section>

          {/* Font Section */}
          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase'>
              <Type className='h-4 w-4' />
              {t('configDrawer.font')}
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {fonts.map((f) => (
                <Button
                  key={f}
                  variant={font === f ? 'default' : 'outline'}
                  className={cn('h-10', f === 'Cairo' ? 'font-cairo' : '')}
                  style={{ fontFamily: f }}
                  onClick={() => {
                    setFont(f)
                    document.body.style.fontFamily = f
                  }}
                >
                  {f}
                </Button>
              ))}
            </div>
          </section>

          {/* Sidebar Section */}
          <section className='space-y-4'>
            <div className='flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase'>
              <Settings2 className='h-4 w-4' />
              {t('configDrawer.sidebar')}
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <Button
                variant={sidebarType === 'default' ? 'default' : 'outline'}
                className='h-10'
                onClick={() => setSidebarType('default')}
              >
                {t('configDrawer.sidebarDefault')}
              </Button>
              <Button
                variant={sidebarType === 'floating' ? 'default' : 'outline'}
                className='h-10'
                onClick={() => setSidebarType('floating')}
              >
                {t('configDrawer.sidebarFloating')}
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
