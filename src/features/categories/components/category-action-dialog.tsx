import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  SearchableSelect,
  type SearchableOption,
} from '@/components/custom-ui/searchable-select'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '../hooks/use-categories'
import { useCategoriesContext } from './categories-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  name_ar: z.string().max(150, 'Max 150 characters').optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

type CategoryFormValues = z.infer<typeof formSchema>

export function CategoryActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, presetParentId } = useCategoriesContext()
  const { data: allCategories = [] } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      parent_id: null,
      description: '',
      is_active: true,
    },
  })

  // Format category options for the parent selector
  const parentOptions: SearchableOption[] = useMemo(() => {
    return allCategories
      .filter((c) => {
        // Disallow selecting self as parent when editing
        if (isEdit && currentRow && c.id === currentRow.id) {
          return false
        }
        return true
      })
      .map((c) => ({
        id: c.id,
        name: c.name_ar ? `${c.name} (${c.name_ar})` : c.name,
        description: c.parent ? `Subcategory of ${c.parent.name}` : 'Root Department',
      }))
  }, [allCategories, isEdit, currentRow])

  useEffect(() => {
    if (isOpen) {
      if (currentRow) {
        form.reset({
          name: currentRow.name,
          name_ar: currentRow.name_ar || '',
          parent_id: currentRow.parent_id || null,
          description: currentRow.description || '',
          is_active: currentRow.is_active ?? true,
        })
      } else {
        form.reset({
          name: '',
          name_ar: '',
          parent_id: presetParentId || null,
          description: '',
          is_active: true,
        })
      }
    }
  }, [isOpen, currentRow, presetParentId, form])

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        name_ar: values.name_ar?.trim() || null,
        nameAr: values.name_ar?.trim() || null,
        parent_id: values.parent_id || null,
        parentId: values.parent_id || null,
        description: values.description?.trim() || null,
        isActive: values.is_active,
        is_active: values.is_active,
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          input: payload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setOpen(null)
    } catch {
      // Handled by mutation onError toast
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-[520px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('categories.editCategory') : t('categories.createCategory')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the category details, parent department, and Arabic translations.'
              : 'Add a new category or subcategory with dual-language support.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
            {/* English Category Name */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categories.form.name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('categories.form.namePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Arabic Category Name */}
            <FormField
              control={form.control}
              name='name_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center justify-between'>
                    <span>{t('categories.form.nameAr', { defaultValue: 'Category Name (Arabic)' })}</span>
                    <span className='text-[11px] text-muted-foreground font-arabic' dir='rtl'>
                      الاسم بالعربية
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      dir='rtl'
                      className='font-arabic text-right'
                      placeholder={t('categories.form.nameArPlaceholder', { defaultValue: 'مثال: المشروبات الساخنة' })}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription className='text-xs text-muted-foreground'>
                    Displayed across Arabic menus, POS, and digital customer catalogs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Category Selector */}
            <FormField
              control={form.control}
              name='parent_id'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>{t('categories.form.parent')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      options={parentOptions}
                      placeholder={t('categories.form.selectParent')}
                      searchPlaceholder='Search parent categories...'
                      allowNone={true}
                      noneLabel={t('categories.form.selectParent')}
                    />
                  </FormControl>
                  <FormDescription className='text-xs text-muted-foreground'>
                    Select a parent department to create a subcategory, or leave as None for a root department.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categories.form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('categories.form.descriptionPlaceholder')}
                      className='resize-none h-20'
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Switch */}
            <FormField
              control={form.control}
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-sm font-medium'>
                      {t('categories.form.status')}
                    </FormLabel>
                    <FormDescription className='text-xs text-muted-foreground'>
                      {t('categories.form.isActive', { defaultValue: 'Category is active and visible in catalog' })}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(null)}
                disabled={isSaving}
              >
                {t('categories.form.cancel')}
              </Button>
              <Button type='submit' disabled={isSaving}>
                {isSaving ? t('categories.form.saving') : t('categories.form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
