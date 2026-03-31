'use client'

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
import { useCountries } from '@/features/countries/hooks/use-countries'
import { type City } from '../data/schema'
import { useCreateCity, useUpdateCity } from '../hooks/use-cities'
import { cityFormSchema, type CityForm } from './cities-action-dialog.schema'

type CityActionDialogProps = {
  currentRow?: City
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CitiesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: CityActionDialogProps) {
  const isEdit = !!currentRow
  const createCity = useCreateCity()
  const updateCity = useUpdateCity()
  const { data: countries = [] } = useCountries()

  const form = useForm<CityForm>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          country_id: currentRow.country_id,
          is_active: currentRow.is_active,
        }
      : {
          name: '',
          country_id: '',
          is_active: true,
        },
  })

  const onSubmit = (values: CityForm) => {
    if (isEdit) {
      updateCity.mutate(
        { id: currentRow?.id, ...values },
        {
          onSuccess: () => {
            form.reset()
            toast.success('City updated successfully', {
              description: `City ${values.name} has been updated.`,
            })
            onOpenChange(false)
          },
          onError: (error) => {
            toast.error('Failed to update city', {
              description: error.message,
            })
          },
        }
      )
    } else {
      createCity.mutate(values, {
        onSuccess: () => {
          form.reset()
          toast.success('City added successfully', {
            description: `City ${values.name} has been added.`,
          })
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error('Failed to add city', {
            description: error.message,
          })
        },
      })
    }
  }

  const isPending = createCity.isPending || updateCity.isPending

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
          <DialogTitle>{isEdit ? 'Edit City' : 'Add New City'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the city details here. '
              : 'Create a new city here. '}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='city-form'
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
                      placeholder='City name'
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
              name='country_id'
              render={({ field }) => (
                <FormItem className='grid grid-cols-4 items-center gap-4 space-y-0'>
                  <FormLabel className='text-right'>Country</FormLabel>
                  <FormControl>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Select country'
                      className='col-span-3'
                      items={countries.map((c) => ({
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
          <Button type='submit' form='city-form' disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
