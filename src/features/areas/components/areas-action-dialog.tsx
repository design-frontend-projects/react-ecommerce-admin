import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { SelectDropdown } from '@/components/select-dropdown'
import { type Area } from '../data/schema'
import { useCreateArea, useUpdateArea } from '../hooks/use-areas'
import { useCities } from '@/features/cities/hooks/use-cities'
import { areaFormSchema, type AreaForm } from './areas-action-dialog.schema'

type AreaActionDialogProps = {
  currentRow?: Area
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AreasActionDialog({
  currentRow,
  open,
  onOpenChange,
}: AreaActionDialogProps) {
  const isEdit = !!currentRow
  const createArea = useCreateArea()
  const updateArea = useUpdateArea()
  const { data: cities = [] } = useCities()

  const form = useForm<AreaForm>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          city_id: currentRow.city_id,
          is_active: currentRow.is_active,
        }
      : {
          name: '',
          city_id: 0,
          is_active: true,
        },
  })

  const onSubmit = (values: AreaForm) => {
    if (isEdit) {
      updateArea.mutate(
        { id: currentRow.id, ...values },
        {
          onSuccess: () => {
            form.reset()
            toast.success('Area updated successfully', {
              description: `Area ${values.name} has been updated.`,
            })
            onOpenChange(false)
          },
          onError: (error) => {
            toast.error('Failed to update area', {
              description: error.message,
            })
          },
        }
      )
    } else {
      createArea.mutate(values, {
        onSuccess: () => {
          form.reset()
          toast.success('Area added successfully', {
            description: `Area ${values.name} has been added.`,
          })
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error('Failed to add area', {
            description: error.message,
          })
        },
      })
    }
  }

  const isPending = createArea.isPending || updateArea.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? 'Edit Area' : 'Add New Area'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the area details here. ' : 'Create a new area here. '}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='area-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-4 items-center gap-4 space-y-0'>
                  <FormLabel className='text-right'>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Area name'
                      className='col-span-3'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-3 col-start-2' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='city_id'
              render={({ field }) => (
                <FormItem className='grid grid-cols-4 items-center gap-4 space-y-0'>
                  <FormLabel className='text-right'>City</FormLabel>
                  <FormControl>
                    <SelectDropdown
                      defaultValue={String(field.value)}
                      onValueChange={(val) => field.onChange(Number(val))}
                      placeholder='Select city'
                      className='col-span-3'
                      items={cities.map((c) => ({
                        label: c.name,
                        value: String(c.id),
                      }))}
                    />
                  </FormControl>
                  <FormMessage className='col-span-3 col-start-2' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='is_active'
              render={({ field }) => (
                <FormItem className='grid grid-cols-4 items-center gap-4 space-y-0'>
                  <FormLabel className='text-right'>Active</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className='col-span-3 col-start-2' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='area-form' disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
