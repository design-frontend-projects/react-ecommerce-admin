import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import { fonts } from '@/config/fonts'
import { cn } from '@/lib/utils'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useUpsertSetting } from '../data/queries'

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  font: z.enum(fonts),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

function ThemePreview({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <div className={cn('space-y-2 rounded-sm bg-background p-2', mode)}>
      <div className='space-y-2 rounded-md border border-border bg-card p-2 shadow-xs'>
        <div className='h-2 w-[80px] rounded-lg bg-muted' />
        <div className='h-2 w-[100px] rounded-lg bg-muted' />
      </div>
      <div className='flex items-center gap-2 rounded-md border border-border bg-card p-2 shadow-xs'>
        <div className='h-4 w-4 rounded-full bg-primary/30' />
        <div className='h-2 w-[100px] rounded-lg bg-muted' />
      </div>
      <div className='flex items-center gap-2 rounded-md border border-border bg-card p-2 shadow-xs'>
        <div className='h-4 w-4 rounded-full bg-accent' />
        <div className='h-2 w-[100px] rounded-lg bg-muted' />
      </div>
    </div>
  )
}

export function AppearanceForm() {
  const { t } = useTranslation()
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()
  const [isSaving, setIsSaving] = useState(false)
  const upsertSetting = useUpsertSetting()

  const defaultValues: AppearanceFormValues = {
    theme: (theme as AppearanceFormValues['theme']) || 'system',
    font,
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues,
  })

  async function onSubmit(data: AppearanceFormValues) {
    setIsSaving(true)
    try {
      if (data.font !== font) setFont(data.font)
      if (data.theme !== theme) setTheme(data.theme)

      try {
        await upsertSetting.mutateAsync({
          key: 'appearance.theme',
          value: data,
          group: 'appearance',
          is_public: true,
        })
      } catch {
        // Server persistence deferred, local state applied
      }

      toast.success(
        t('settings.appearance.savedSuccess', 'Appearance preferences updated successfully')
      )
    } catch {
      toast.error(t('settings.common.savedError', 'Failed to save settings'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='font'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.appearance.font', 'Font')}</FormLabel>
              <div className='relative w-max'>
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal capitalize'
                    )}
                    {...field}
                  >
                    {fonts.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <ChevronDownIcon className='absolute end-3 top-2.5 h-4 w-4 opacity-50' />
              </div>
              <FormDescription className='font-manrope'>
                {t(
                  'settings.appearance.fontDesc',
                  'Set the font you want to use in the dashboard.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='theme'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.appearance.theme', 'Theme')}</FormLabel>
              <FormDescription>
                {t(
                  'settings.appearance.themeDesc',
                  'Select the theme for the dashboard.'
                )}
              </FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className='grid max-w-3xl grid-cols-1 gap-6 pt-2 md:grid-cols-3'
              >
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary cursor-pointer'>
                    <FormControl>
                      <RadioGroupItem value='light' className='sr-only' />
                    </FormControl>
                    <div className='items-center rounded-md border-2 border-muted p-1 hover:border-accent'>
                      <ThemePreview mode='light' />
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settings.appearance.themeLight', 'Light')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary cursor-pointer'>
                    <FormControl>
                      <RadioGroupItem value='dark' className='sr-only' />
                    </FormControl>
                    <div className='items-center rounded-md border-2 border-muted p-1 hover:border-accent'>
                      <ThemePreview mode='dark' />
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settings.appearance.themeDark', 'Dark')}
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className='[&:has([data-state=checked])>div]:border-primary cursor-pointer'>
                    <FormControl>
                      <RadioGroupItem value='system' className='sr-only' />
                    </FormControl>
                    <div className='items-center rounded-md border-2 border-muted p-1 hover:border-accent'>
                      <div className='grid grid-cols-2 gap-1 rounded-sm bg-muted p-2'>
                        <ThemePreview mode='light' />
                        <ThemePreview mode='dark' />
                      </div>
                    </div>
                    <span className='block w-full p-2 text-center font-normal'>
                      {t('settings.appearance.themeSystem', 'System')}
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <Button
          type='submit'
          disabled={isSaving}
          className='flex items-center gap-2'
        >
          {isSaving ? (
            <>
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
              {t('settings.appearance.updating', 'Updating preferences...')}
            </>
          ) : (
            <>
              <Check className='me-2 h-4 w-4' />
              {t('settings.appearance.submit', 'Update preferences')}
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
