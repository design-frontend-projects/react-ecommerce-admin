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
import { type Country } from '../data/schema'
import { useCreateCountry, useUpdateCountry } from '../hooks/use-countries'
import { countryFormSchema, type CountryForm } from './countries-action-dialog.schema'

type CountryActionDialogProps = {
  currentRow?: Country
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CountriesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: CountryActionDialogProps) {
  const isEdit = !!currentRow
  const createCountry = useCreateCountry()
  const updateCountry = useUpdateCountry()

  const form = useForm<CountryForm>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          code: currentRow.code,
          phone_code: currentRow.phone_code ?? '',
          is_active: currentRow.is_active,
        }
      : {
          name: '',
          code: '',
          phone_code: '',
          is_active: true,
        },
  })

  const onSubmit = (values: CountryForm) => {
    if (isEdit) {
      updateCountry.mutate(
        { id: currentRow.id, ...values },
        {
          onSuccess: () => {
            form.reset()
            toast.success('Country updated successfully', {
              description: `Country ${values.name} has been updated.`,
            })
            onOpenChange(false)
          },
          onError: (error) => {
            toast.error('Failed to update country', {
              description: error.message,
            })
          },
        }
      )
    } else {
      createCountry.mutate(values, {
        onSuccess: () => {
          form.reset()
          toast.success('Country added successfully', {
            description: `Country ${values.name} has been added.`,
          })
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error('Failed to add country', {
            description: error.message,
          })
        },
      })
    }
  }

  const isPending = createCountry.isPending || updateCountry.isPending

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
          <DialogTitle>{isEdit ? 'Edit Country' : 'Add New Country'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the country details here. ' : 'Create a new country here. '}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='country-form'
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
                      placeholder='Country name'
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
              name='code'
              render={({ field }) => (
                <FormItem className='grid grid-cols-4 items-center gap-4 space-y-0'>
                  <FormLabel className='text-right'>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Country code (e.g. US, VN)'
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
              name='phone_code'
              render={({ field }) => (
                <FormItem className='grid grid-cols-4 items-center gap-4 space-y-0'>
                  <FormLabel className='text-right'>Phone Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='+1, +84, etc.'
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
          <Button type='submit' form='country-form' disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
