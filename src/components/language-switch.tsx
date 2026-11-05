import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDirection } from '@/context/direction-provider'

const languages = [
  { code: 'en', label: 'English', dir: 'ltr' as const },
  { code: 'ar', label: 'العربية', dir: 'rtl' as const },
]

export function LanguageSwitch() {
  const { i18n, t } = useTranslation()
  const { setDir } = useDirection()

  const handleLanguageChange = (code: string, dir: 'ltr' | 'rtl') => {
    i18n.changeLanguage(code)
    setDir(dir)
  }

  const currentLangCode = i18n.language?.split('-')[0].split('_')[0] || 'en'

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='scale-95 rounded-full'>
          <Languages className='size-[1.2rem] scale-100 transition-all' />
          <span className='sr-only'>{t('common.switchLanguage', 'Switch Language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code, lang.dir)}
          >
            {lang.label}
            <Check
              size={14}
              className={cn(
                'ms-auto',
                currentLangCode !== lang.code && 'hidden'
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
