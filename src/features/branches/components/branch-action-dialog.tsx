import { useEffect } from 'react'
import { z } from 'zod'
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
import { useCreateBranch, useUpdateBranch } from '../hooks/use-branches'
import { useBranchesContext } from './branches-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city_id: z.string().min(1, 'City is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
})

type BranchFormValues = z.infer<typeof formSchema>

export function BranchActionDialog() {
  const { open, setOpen, currentRow } = useBranchesContext()
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()
  const { data: cities } = useCities()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      city_id: '',
      address: '',
      phone: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name,
        city_id: currentRow.city_id,
        address: currentRow.address || '',
        phone: currentRow.phone || '',
        is_active: currentRow.is_active,
      })
    } else {
      form.reset({
        name: '',
        city_id: '',
        address: '',
        phone: '',
        is_active: true,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: BranchFormValues) => {
    try {
      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          ...values,
        })
        toast.success('Branch updated successfully')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Branch created successfully')
      }
      setOpen(null)
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Branch' : 'Create Branch'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the branch details below.'
              : 'Add a new branch to your system.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='pr-4 -mr-4 h-[380px]'>
          <Form {...form}>
            <form
              id='branch-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Branch name' {...field} />
                    </FormControl>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a city' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities?.map((city) => (
                          <SelectItem
                            key={city.id}
                            value={String(city.id)}
                          >
                            {city.name}
                            {city.countries?.name
                              ? ` (${city.countries.name})`
                              : ''}
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
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Street address (optional)'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder='+1-555-0100' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Active</FormLabel>
                      <div className='text-sm text-muted-foreground'>
                        Determine if this branch is operational.
                      </div>
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
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => setOpen(null)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='branch-form'
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
