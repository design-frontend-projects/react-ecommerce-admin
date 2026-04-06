import { useEffect } from 'react'
import { z } from 'zod'
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useUser } from '@clerk/clerk-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCities } from '@/features/cities/hooks/use-cities'
import { useBranches } from '@/features/branches/hooks/use-branches'
import { useCreateStore, useUpdateStore } from '../hooks/use-stores'
import { useStoresContext } from './stores-provider'


const formSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  status: z.boolean(),
  clerk_user_id: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  city_id: z.string().optional().nullable(),
  country_id: z.string().optional().nullable(),
  branch_id: z.string().optional().nullable(),
})

type StoreFormValues = z.infer<typeof formSchema>

export function StoreActionDialog() {
  const { open, setOpen, currentRow } = useStoresContext()
  const { user } = useUser()
  const createMutation = useCreateStore()
  const updateMutation = useUpdateStore()
  const { data: cities } = useCities()
  const { data: branches } = useBranches()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(formSchema) as Resolver<StoreFormValues>,
    defaultValues: {
      name: '',
      clerk_user_id: user?.id || '',
      phone: '',
      email: '',
      address: '',
      latitude: undefined,
      longitude: undefined,
      city_id: '',
      country_id: '',
      branch_id: '',
      status: true,
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (currentRow) {
        form.reset({
          name: currentRow.name || '',
          clerk_user_id: currentRow.clerk_user_id || user?.id || '',
          phone: currentRow.phone || '',
          email: currentRow.email || '',
          address: currentRow.address || '',
          latitude: currentRow.latitude || undefined,
          longitude: currentRow.longitude || undefined,
          city_id: currentRow.city_id || '',
          country_id: currentRow.country_id || '',
          branch_id: String(currentRow.branch_id || ''),
          status: currentRow.status ?? true,
        })
      } else {
        form.reset({
          name: '',
          clerk_user_id: user?.id || '',
          phone: '',
          email: '',
          address: '',
          latitude: undefined,
          longitude: undefined,
          city_id: '',
          country_id: '',
          branch_id: '',
          status: true,
        })
      }
    }
  }, [currentRow, form, user?.id, isOpen])

  const onSubmit: SubmitHandler<StoreFormValues> = async (data) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          store_id: currentRow.store_id,
          ...data,
        })
        toast.success('Store updated successfully')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Store created successfully')
      }
      setOpen(null)
    } catch (error: any) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Store' : 'Create Store'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the store details below.'
              : 'Add a new location to your system.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='pr-4 -mr-4 h-[450px]'>
          <Form {...form}>
            <form id='store-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Main Branch' {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='branch_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a branch' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem key={branch.id} value={String(branch.id)}>
                              {branch.name}
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
                  name='city_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a city' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cities?.map((city) => (
                            <SelectItem key={city.id} value={String(city.id)}>
                              {city.name} {city.countries?.name ? `(${city.countries.name})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder='Street address' {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder='+1-555-0100' {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder='contact@store.com' {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='latitude'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder='0.000000' 
                          {...field} 
                          value={field.value || ''} 
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='longitude'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder='0.000000' 
                          {...field} 
                          value={field.value || ''} 
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Active</FormLabel>
                      <div className='text-sm text-muted-foreground'> Operational status. </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(null)} disabled={createMutation.isPending || updateMutation.isPending}>
            Cancel
          </Button>
          <Button type='submit' form='store-form' disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
