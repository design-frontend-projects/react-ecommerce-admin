import { z } from 'zod'
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
import { useUpdateTermsMutation, type AppTerm } from '../data/queries'

const formSchema = z.object({
  title_en: z.string().min(1, 'English title is required'),
  title_ar: z.string().min(1, 'Arabic title is required'),
  content_en: z.string().min(1, 'English content is required'),
  content_ar: z.string().min(1, 'Arabic content is required'),
})

type FormValues = z.infer<typeof formSchema>

interface TermsEditorProps {
  terms: AppTerm | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function TermsEditor({ terms, onSuccess, onCancel }: TermsEditorProps) {
  const { t } = useTranslation()
  const mutation = useUpdateTermsMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_en: terms?.title_en || 'Terms and Conditions',
      title_ar: terms?.title_ar || 'الشروط والأحكام',
      content_en: terms?.content_en || '',
      content_ar: terms?.content_ar || '',
    },
  })

  async function onSubmit(data: FormValues) {
    try {
      await mutation.mutateAsync(data)
      toast.success(
        t('terms.successUpdate', 'Terms and conditions updated successfully')
      )
      onSuccess?.()
    } catch (_error) {
      toast.error(
        t('terms.errorUpdate', 'Failed to update terms and conditions')
      )
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='mx-auto max-w-4xl space-y-6 rounded-lg border bg-card p-6 shadow-sm'
      >
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>
            {t('terms.editTitle', 'Edit Terms and Conditions')}
          </h3>

          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='title_en'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (English)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='title_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Arabic)</FormLabel>
                  <FormControl>
                    <Input {...field} dir='rtl' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-1 gap-6'>
            <FormField
              control={form.control}
              name='content_en'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (English)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className='min-h-[300px] resize-y'
                      placeholder='Enter the terms and conditions in English...'
                    />
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
                  <FormLabel>Content (Arabic)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className='min-h-[300px] resize-y'
                      dir='rtl'
                      placeholder='أدخل الشروط والأحكام باللغة العربية...'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className='flex justify-end space-x-4 space-x-reverse rtl:space-x-reverse'>
          {onCancel && (
            <Button type='button' variant='outline' onClick={onCancel}>
              {t('terms.cancelButton', 'Cancel')}
            </Button>
          )}
          <Button type='submit' disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {t('terms.saveButton', 'Save Changes')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
