// Menu Category Dialog Component
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
        toast.success('Category updated', {
          description: 'Menu category has been updated successfully.',
        })
      } else {
        await createCategory.mutateAsync({
          name: values.name,
          nameAr: values.name_ar || undefined,
          icon: values.icon || undefined,
          sortOrder: values.sort_order,
          isActive: values.is_active,
        })
        toast.success('Category created', {
          description: 'Menu category has been created successfully.',
        })
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error('Error', {
        description:
          error instanceof Error ? error.message : 'An error occurred',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the menu category details.'
              : 'Add a new menu category.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (English)</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., Appetizers' {...field} />
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
                  <FormLabel>Name (Arabic)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='مقبلات'
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
                  <FormLabel>Icon (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., 🍕 or icon name'
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
                  <FormLabel>Sort Order</FormLabel>
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
                    <FormLabel>Active</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      Show this category in the menu
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
                Cancel
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
