// Floor Dialog Component
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
import { Textarea } from '@/components/ui/textarea'
import { useCreateFloor, useUpdateFloor } from '../api/mutations'
import { floorFormSchema, type FloorForm } from '../schemas/floors.schema'
import type { ResFloor } from '../types'

interface FloorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floor?: ResFloor | null
}

export function FloorDialog({ open, onOpenChange, floor }: FloorDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!floor

  const form = useForm<FloorForm>({
    resolver: zodResolver(floorFormSchema),
    defaultValues: {
      name: '',
      description: '',
      sort_order: 0,
      is_active: true,
    },
  })

  const createFloor = useCreateFloor()
  const updateFloorMutation = useUpdateFloor()

  const isLoading = createFloor.isPending || updateFloorMutation.isPending

  useEffect(() => {
    if (floor) {
      form.reset({
        name: floor.name,
        description: floor.description || '',
        sort_order: floor.sort_order,
        is_active: floor.is_active,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        sort_order: 0,
        is_active: true,
      })
    }
  }, [floor, form])

  async function onSubmit(values: FloorForm) {
    try {
      if (isEditing && floor) {
        await updateFloorMutation.mutateAsync({
          floorId: floor.id,
          name: values.name,
          description: values.description || undefined,
          sortOrder: values.sort_order,
          isActive: values.is_active,
        })
        toast.success(t('respos.floor.success.updated'), {
          description: t('respos.floor.success.updatedDesc'),
        })
      } else {
        await createFloor.mutateAsync({
          name: values.name,
          description: values.description || undefined,
          sortOrder: values.sort_order,
          isActive: values.is_active,
        })
        toast.success(t('respos.floor.success.created'), {
          description: t('respos.floor.success.createdDesc'),
        })
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error(t('respos.floor.error.title'), {
        description:
          error instanceof Error ? error.message : t('respos.floor.error.unknown'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('respos.floor.edit') : t('respos.floor.add')}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('respos.floor.editDesc')
              : t('respos.floor.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.floor.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('respos.floor.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.floor.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('respos.floor.descriptionPlaceholder')}
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
                  <FormLabel>{t('respos.floor.sortOrder')}</FormLabel>
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
                    <FormLabel>{t('respos.floor.active')}</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      {t('respos.floor.activeDesc')}
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
                {t('respos.floor.cancel')}
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEditing ? t('respos.floor.update') : t('respos.floor.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
