// Menu Category Dialog Component
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useCreateMenuCategory, useUpdateMenuCategory } from '../api/mutations'
import {
  menuCategoryFormSchema,
  type MenuCategoryForm,
} from '../schemas/menu.schema'
import type { ResMenuCategory } from '../types'

interface MenuCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: ResMenuCategory | null
}

export function MenuCategoryDialog({
  open,
  onOpenChange,
  category,
}: MenuCategoryDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!category

  const form = useForm<MenuCategoryForm>({
    resolver: zodResolver(menuCategoryFormSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      icon: '',
      sort_order: 0,
      is_active: true,
    },
  })

  const createCategory = useCreateMenuCategory()
  const updateCategory = useUpdateMenuCategory()

  const isLoading = createCategory.isPending || updateCategory.isPending

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        name_ar: category.name_ar || '',
        icon: category.icon || '',
        sort_order: category.sort_order,
        is_active: category.is_active,
      })
    } else {
      form.reset({
        name: '',
        name_ar: '',
        icon: '',
        sort_order: 0,
        is_active: true,
      })
    }
  }, [category, form])

  async function onSubmit(values: MenuCategoryForm) {
    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({
          categoryId: category.id,
          name: values.name,
          nameAr: values.name_ar || undefined,
          icon: values.icon || undefined,
          sortOrder: values.sort_order,
          isActive: values.is_active,
        })
        toast.success(t('respos.menuCategory.success.updated'), {
          description: t('respos.menuCategory.success.updatedDesc'),
        })
      } else {
        await createCategory.mutateAsync({
          name: values.name,
          nameAr: values.name_ar || undefined,
          icon: values.icon || undefined,
          sortOrder: values.sort_order,
          isActive: values.is_active,
        })
        toast.success(t('respos.menuCategory.success.created'), {
          description: t('respos.menuCategory.success.createdDesc'),
        })
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error(t('respos.menuCategory.error.title'), {
        description:
          error instanceof Error
            ? error.message
            : t('respos.menuCategory.error.unknown'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('respos.menuCategory.edit')
              : t('respos.menuCategory.add')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('respos.menuCategory.editDesc')
              : t('respos.menuCategory.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.menuCategory.nameEn')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('respos.menuCategory.nameEnPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='name_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.menuCategory.nameAr')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('respos.menuCategory.nameArPlaceholder')}
                      dir='rtl'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='icon'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.menuCategory.icon')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('respos.menuCategory.iconPlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='sort_order'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.menuCategory.sortOrder')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <FormLabel>{t('respos.menuCategory.active')}</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      {t('respos.menuCategory.activeDesc')}
                    </p>
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

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                {t('respos.menuCategory.cancel')}
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEditing
                  ? t('respos.menuCategory.update')
                  : t('respos.menuCategory.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
