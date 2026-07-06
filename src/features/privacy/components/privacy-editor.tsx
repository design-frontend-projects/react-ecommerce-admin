import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type PrivacyPolicy, useUpdatePrivacyMutation } from '../data/queries'

const privacySchema = z.object({
  title_en: z.string().min(1, 'English title is required'),
  title_ar: z.string().min(1, 'Arabic title is required'),
  content_en: z.string().min(1, 'English content is required'),
  content_ar: z.string().min(1, 'Arabic content is required'),
})

type PrivacyFormValues = z.infer<typeof privacySchema>

interface PrivacyEditorProps {
  initialData: PrivacyPolicy | null
  onSuccess: () => void
  onCancel: () => void
}

export function PrivacyEditor({
  initialData,
  onSuccess,
  onCancel,
}: PrivacyEditorProps) {
  const { t } = useTranslation()
  const mutation = useUpdatePrivacyMutation()

  const form = useForm<PrivacyFormValues>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      title_en: initialData?.title_en || '',
      title_ar: initialData?.title_ar || '',
      content_en: initialData?.content_en || '',
      content_ar: initialData?.content_ar || '',
    },
  })

  async function onSubmit(data: PrivacyFormValues) {
    try {
      await mutation.mutateAsync(data)
      toast.success(t('privacy.successUpdate'))
      onSuccess()
    } catch (_error) {
      toast.error(t('privacy.errorUpdate'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-4 rounded-lg border p-4'>
            <h3 className='text-lg font-semibold'>English</h3>
            <FormField
              control={form.control}
              name='title_en'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder='Privacy Policy' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='content_en'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Enter privacy policy in English...'
                      className='min-h-[300px]'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='space-y-4 rounded-lg border p-4' dir='rtl'>
            <h3 className='text-lg font-semibold'>العربية</h3>
            <FormField
              control={form.control}
              name='title_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Input placeholder='سياسة الخصوصية' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='content_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المحتوى</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='أدخل سياسة الخصوصية بالعربية...'
                      className='min-h-[300px]'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            {t('privacy.cancelButton')}
          </Button>
          <Button type='submit' disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {t('privacy.saveButton')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
