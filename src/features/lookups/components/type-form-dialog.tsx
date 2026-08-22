import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Button } from '@/components/ui/button'
import {
  lookupTypeFormSchema,
  type LookupTypeFormValues,
} from '../data/schema'
import { useCreateLookupType } from '../hooks/use-lookups'
import { useLookupsContext } from './provider'

export function TypeFormDialog() {
  const { isCreateTypeOpen, setIsCreateTypeOpen } = useLookupsContext()
  const createTypeMutation = useCreateLookupType()

  const form = useForm<LookupTypeFormValues>({
    resolver: zodResolver(lookupTypeFormSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      sortOrder: 0,
    },
  })

  React.useEffect(() => {
    if (isCreateTypeOpen) {
      form.reset({
        code: '',
        name: '',
        description: '',
        sortOrder: 0,
      })
    }
  }, [isCreateTypeOpen, form])

  const onSubmit = async (values: LookupTypeFormValues) => {
    await createTypeMutation.mutateAsync(values)
    setIsCreateTypeOpen(false)
  }

  return (
    <Dialog open={isCreateTypeOpen} onOpenChange={setIsCreateTypeOpen}>
      <DialogContent className='sm:max-w-[460px]'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            Create Custom Lookup Catalog
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Register a new domain master lookup type to configure tenant-specific options and dropdowns.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
            {/* Catalog Code */}
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Catalog Code Key <span className='text-rose-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. vehicle_type, warranty_tier'
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                        )
                      }
                      className='font-mono text-xs'
                    />
                  </FormControl>
                  <FormDescription className='text-[11px]'>
                    Unique identifier (lowercase letters, numbers, and underscores).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display Name */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Catalog Name <span className='text-rose-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Vehicle Classification'
                      {...field}
                      className='text-xs'
                    />
                  </FormControl>
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
                  <FormLabel className='text-xs font-semibold'>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Describe purpose and where this lookup will be utilized...'
                      {...field}
                      value={field.value || ''}
                      rows={2}
                      className='text-xs resize-none'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sort Order */}
            <FormField
              control={form.control}
              name='sortOrder'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      className='text-xs font-mono w-24'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='pt-3 gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setIsCreateTypeOpen(false)}
                className='text-xs'
              >
                Cancel
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={createTypeMutation.isPending}
                className='text-xs font-semibold'
              >
                {createTypeMutation.isPending ? 'Creating Catalog...' : 'Create Catalog'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
