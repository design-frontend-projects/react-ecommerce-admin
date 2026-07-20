import { useEffect } from 'react'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import { codeFieldSchema, type Screen } from '../data/schema'
import { useCreateScreen, useUpdateScreen } from '../hooks/use-screens'

const screenFormSchema = z.object({
  code: codeFieldSchema,
  name: z.string().trim().min(1, 'Name is required'),
  route: z.string().trim().min(1, 'Route is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  moduleId: z.string().min(1, 'Module is required'),
  sortOrder: z.coerce.number().int().min(0, 'Sort order must be 0 or more'),
  isActive: z.boolean(),
})

type ScreenFormValues = z.infer<typeof screenFormSchema>

const emptyValues: ScreenFormValues = {
  code: '',
  name: '',
  route: '',
  description: '',
  icon: '',
  moduleId: '',
  sortOrder: 0,
  isActive: true,
}

function toFormValues(screen: Screen, moduleId: string): ScreenFormValues {
  return {
    code: screen.code,
    name: screen.name,
    route: screen.route,
    description: screen.description ?? '',
    icon: screen.icon ?? '',
    moduleId,
    sortOrder: screen.sortOrder,
    isActive: screen.isActive,
  }
}

interface ScreenFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modules: Array<{ id: string; name: string }>
  /** When set, the dialog edits this screen; otherwise it creates a new one. */
  screen: Screen | null
  /** Module the edited screen currently belongs to. */
  screenModuleId: string | null
}

export function ScreenFormDialog({
  open,
  onOpenChange,
  modules,
  screen,
  screenModuleId,
}: ScreenFormDialogProps) {
  const createMutation = useCreateScreen()
  const updateMutation = useUpdateScreen()
  const isPending = createMutation.isPending || updateMutation.isPending
  const isSystem = screen?.isSystem ?? false

  const form = useForm<ScreenFormValues>({
    resolver: zodResolver(screenFormSchema) as Resolver<ScreenFormValues>,
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      screen ? toFormValues(screen, screenModuleId ?? '') : emptyValues
    )
  }, [open, screen, screenModuleId, form])

  const onSubmit = (values: ScreenFormValues) => {
    const shared = {
      name: values.name,
      description: values.description?.trim() ? values.description.trim() : null,
      icon: values.icon?.trim() ? values.icon.trim() : null,
      moduleId: values.moduleId,
      sortOrder: values.sortOrder,
    }

    if (screen) {
      updateMutation.mutate(
        {
          id: screen.id,
          ...shared,
          isActive: values.isActive,
          // Code and route are locked server-side for system screens.
          ...(isSystem ? {} : { code: values.code, route: values.route }),
        },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }

    createMutation.mutate(
      { ...shared, code: values.code, route: values.route },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isPending && onOpenChange(value)}>
      <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{screen ? 'Edit screen' : 'Create screen'}</DialogTitle>
          <DialogDescription>
            {screen
              ? 'Update the screen registry entry. Code and route are locked for system screens.'
              : 'Register a new screen so it can be granted to roles and shown in navigation.'}
          </DialogDescription>
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
                    <Input placeholder='Stock adjustments' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='stock_adjustments'
                        disabled={isSystem}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='route'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='/stock-adjustments'
                        disabled={isSystem}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='moduleId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select a module' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.name}
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
                name='sortOrder'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input type='number' min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='icon'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='package (lucide icon name, optional)'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Optional description'
                      className='resize-none'
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {screen && (
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                    <div className='space-y-0.5'>
                      <FormLabel>Active</FormLabel>
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
            )}
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {screen ? 'Save changes' : 'Create screen'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
