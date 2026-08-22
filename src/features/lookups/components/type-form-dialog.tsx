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
import { Switch } from '@/components/ui/switch'
import { Database, ShieldCheck, Activity, Hash, Layers } from 'lucide-react'
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
      is_system: false,
      is_active: true,
    },
  })

  React.useEffect(() => {
    if (isCreateTypeOpen) {
      form.reset({
        code: '',
        name: '',
        description: '',
        sortOrder: 0,
        is_system: false,
        is_active: true,
      })
    }
  }, [isCreateTypeOpen, form])

  const onSubmit = async (values: LookupTypeFormValues) => {
    await createTypeMutation.mutateAsync(values)
    setIsCreateTypeOpen(false)
  }

  return (
    <Dialog open={isCreateTypeOpen} onOpenChange={setIsCreateTypeOpen}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader className='space-y-2 pb-1'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs'>
              <Database className='h-4.5 w-4.5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold tracking-tight'>
                Create Custom Lookup Catalog
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Register a new domain master lookup type to configure standardized options.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3.5 py-1 text-xs'>
            {/* Catalog Code and Sort Order */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <div className='sm:col-span-2'>
                <FormField
                  control={form.control}
                  name='code'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                        <Layers className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>Catalog Code Key</span>
                        <span className='text-destructive'>*</span>
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
                      <FormDescription className='text-[10px]'>
                        Unique key (lowercase, numbers, underscores).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name='sortOrder'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                        <Hash className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>Sort Order</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          placeholder='0'
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                          className='text-xs font-mono'
                        />
                      </FormControl>
                      <FormDescription className='text-[10px]'>
                        List sequence.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Display Name */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Catalog Name <span className='text-destructive'>*</span>
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

            {/* Switch Toggles for is_system and is_active */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t'>
              {/* is_system Switch */}
              <FormField
                control={form.control}
                name='is_system'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border bg-card/50 p-2.5 shadow-2xs hover:bg-accent/40 transition-colors'>
                    <div className='space-y-0.5 pr-2'>
                      <FormLabel className='text-xs font-semibold flex items-center gap-1.5 cursor-pointer'>
                        <ShieldCheck className='h-3.5 w-3.5 text-blue-500 shrink-0' />
                        <span>System Core</span>
                      </FormLabel>
                      <FormDescription className='text-[10px] leading-tight text-muted-foreground'>
                        Global foundational catalog
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label='Toggle system core catalog'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* is_active Switch */}
              <FormField
                control={form.control}
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border bg-card/50 p-2.5 shadow-2xs hover:bg-accent/40 transition-colors'>
                    <div className='space-y-0.5 pr-2'>
                      <FormLabel className='text-xs font-semibold flex items-center gap-1.5 cursor-pointer'>
                        <Activity className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
                        <span>Active Status</span>
                      </FormLabel>
                      <FormDescription className='text-[10px] leading-tight text-muted-foreground'>
                        Enable catalog for selection
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label='Toggle active status'
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className='pt-3 gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setIsCreateTypeOpen(false)}
                disabled={createTypeMutation.isPending}
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

