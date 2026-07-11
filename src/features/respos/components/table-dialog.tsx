// Table Dialog Component
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Circle, Loader2, Square } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCreateTable, useUpdateTable } from '../api/mutations'
import { useFloors } from '../api/queries'
import { tableFormSchema, type TableForm } from '../schemas/floors.schema'
import type { ResTable } from '../types'

interface TableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table?: ResTable | null
  defaultFloorId?: string
}

export function TableDialog({
  open,
  onOpenChange,
  table,
  defaultFloorId,
}: TableDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!table

  const { data: floors } = useFloors()

  const form = useForm<TableForm>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      floor_id: defaultFloorId || '',
      table_number: '',
      seats: 4,
      position_x: 0,
      position_y: 0,
      shape: 'square',
      is_active: true,
    },
  })

  const createTable = useCreateTable()
  const updateTableMutation = useUpdateTable()

  const isLoading = createTable.isPending || updateTableMutation.isPending

  // eslint-disable-next-line react-hooks/incompatible-library
  const isActive = form.watch('is_active')
  const isFieldsDisabled = !isActive

  useEffect(() => {
    if (table) {
      form.reset({
        floor_id: table.floor_id,
        table_number: table.table_number,
        seats: table.seats,
        position_x: table.position_x,
        position_y: table.position_y,
        shape: table.shape as 'square' | 'round' | 'rectangle',
        is_active: table.is_active,
      })
    } else {
      form.reset({
        floor_id: defaultFloorId || '',
        table_number: '',
        seats: 4,
        position_x: 0,
        position_y: 0,
        shape: 'square',
        is_active: true,
      })
    }
  }, [table, defaultFloorId, form])

  async function onSubmit(values: TableForm) {
    try {
      if (isEditing && table) {
        await updateTableMutation.mutateAsync({
          tableId: table.id,
          floorId: values.floor_id,
          tableNumber: values.table_number,
          seats: values.seats,
          positionX: values.position_x,
          positionY: values.position_y,
          shape: values.shape,
          isActive: values.is_active,
        })
        toast.success(t('respos.floor.table.success.updated'), {
          description: t('respos.floor.table.success.updatedDesc'),
        })
      } else {
        await createTable.mutateAsync({
          floorId: values.floor_id,
          tableNumber: values.table_number,
          seats: values.seats,
          positionX: values.position_x,
          positionY: values.position_y,
          shape: values.shape,
          isActive: values.is_active,
        })
        toast.success(t('respos.floor.table.success.created'), {
          description: t('respos.floor.table.success.createdDesc'),
        })
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error(t('respos.floor.table.error.title'), {
        description:
          error instanceof Error ? error.message : t('respos.floor.table.error.generic'),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{isEditing ? t('respos.floor.table.edit') : t('respos.floor.table.add')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('respos.floor.table.editDesc') : t('respos.floor.table.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='floor_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.floor.table.floor')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isFieldsDisabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('respos.floor.table.selectFloor')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {floors?.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id}>
                          {floor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='table_number'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.floor.table.tableNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('respos.floor.table.tableNumberPlaceholder')} {...field} disabled={isFieldsDisabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='seats'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.floor.table.seats')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      max={50}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      disabled={isFieldsDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='shape'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.floor.table.shape')}</FormLabel>
                  <div className='flex gap-2'>
                    {[
                      { value: 'square', icon: Square, label: t('respos.floor.table.shapes.square') },
                      { value: 'round', icon: Circle, label: t('respos.floor.table.shapes.round') },
                      {
                        value: 'rectangle',
                        icon: Square,
                        label: t('respos.floor.table.shapes.rectangle'),
                      },
                    ].map((shape) => (
                      <Button
                        key={shape.value}
                        type='button'
                        variant={
                          field.value === shape.value ? 'default' : 'outline'
                        }
                        size='sm'
                        onClick={() => field.onChange(shape.value)}
                        className='flex items-center gap-1'
                        disabled={isFieldsDisabled}
                      >
                        <shape.icon className='h-4 w-4' />
                        {shape.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='position_x'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.floor.table.positionX')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={isFieldsDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='position_y'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.floor.table.positionY')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={isFieldsDisabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <FormLabel>{t('respos.floor.table.active')}</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      {t('respos.floor.table.activeDesc')}
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
                {t('respos.floor.table.cancel')}
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEditing ? t('respos.floor.table.update') : t('respos.floor.table.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
