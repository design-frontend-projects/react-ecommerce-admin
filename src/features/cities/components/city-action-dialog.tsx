import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCitiesContext } from './cities-provider'
import { useCreateCity, useUpdateCity } from '../hooks/use-cities'
import { useCountries } from '@/features/countries/hooks/use-countries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  country_id: z.coerce.number().min(1, 'Country is required'),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

export function CityActionDialog() {
  const { isOpen, action, close, selectedCity } = useCitiesContext()
  const createCity = useCreateCity()
  const updateCity = useUpdateCity()
  const { data: countries, isLoading: isCountriesLoading } = useCountries()

  const isCreate = action === 'create'
  const isUpdate = action === 'update'
  const isActionOpen = isOpen && (isCreate || isUpdate)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      country_id: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (isActionOpen && selectedCity) {
      form.reset({
        name: selectedCity.name,
        country_id: selectedCity.country_id,
        is_active: selectedCity.is_active,
      })
    } else if (isActionOpen && isCreate) {
      form.reset({
        name: '',
        country_id: 0,
        is_active: true,
      })
    }
  }, [isActionOpen, selectedCity, isCreate, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isCreate) {
        await createCity.mutateAsync(values)
      } else if (isUpdate && selectedCity) {
        await updateCity.mutateAsync({
          id: selectedCity.id,
          ...values,
        })
      }
      close()
    } catch (error) {
      console.error('Failed to save city:', error)
    }
  }

  const isPending = createCity.isPending || updateCity.isPending

  return (
    <Dialog open={isActionOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Create City' : 'Edit City'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter city name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='country_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    value={field.value ? field.value.toString() : ''}
                    disabled={isCountriesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a country' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries?.map((country) => (
                         <SelectItem key={country.id} value={country.id.toString()}>
                           {country.name}
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
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Active</FormLabel>
                    <div className='text-muted-foreground text-sm'>
                      Allow this city to be used in the system
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

            <DialogFooter>
              <Button type='button' variant='outline' onClick={close}>
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isCreate ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
