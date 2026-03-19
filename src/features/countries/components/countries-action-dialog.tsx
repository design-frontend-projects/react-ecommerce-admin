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
import { SelectDropdown } from '@/components/select-dropdown'
import { type Country } from '../data/schema'
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
  const form = useForm<CountryForm>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          code: currentRow.code,
          status: currentRow.status,
        }
      : {
          name: '',
          code: '',
          status: 'active',
        },
  })

  const onSubmit = (values: CountryForm) => {
    form.reset()
    toast.success(isEdit ? 'Country updated successfully' : 'Country added successfully', {
        description: `Country ${values.name} has been ${isEdit ? 'updated' : 'added'}.`,
    })
    onOpenChange(false)
  }

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
              name='status'
              render={({ field }) => (
                <FormItem className='grid grid-cols-4 items-center gap-4 space-y-0'>
                  <FormLabel className='text-right'>Status</FormLabel>
                  <FormControl>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Select status'
                      className='col-span-3'
                      items={[
                        { label: 'Active', value: 'active' },
                        { label: 'Inactive', value: 'inactive' },
                      ]}
                    />
                  </FormControl>
                  <FormMessage className='col-span-3 col-start-2' />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type='submit' form='country-form'>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
