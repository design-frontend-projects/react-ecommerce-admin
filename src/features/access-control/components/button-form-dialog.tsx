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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { codeFieldSchema, type PermissionButton } from '../data/schema'
import { useCreateButton, useUpdateButton } from '../hooks/use-buttons'

const buttonFormSchema = z.object({
  code: codeFieldSchema,
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
})

type ButtonFormValues = z.infer<typeof buttonFormSchema>

const emptyValues: ButtonFormValues = {
  code: '',
  name: '',
  description: '',
}

interface ButtonFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this button; otherwise it creates a new one. */
  button: PermissionButton | null
}

export function ButtonFormDialog({
  open,
  onOpenChange,
  button,
}: ButtonFormDialogProps) {
  const createMutation = useCreateButton()
  const updateMutation = useUpdateButton()
  const isPending = createMutation.isPending || updateMutation.isPending
  const isSystem = button?.isSystem ?? false

  const form = useForm<ButtonFormValues>({
    resolver: zodResolver(buttonFormSchema) as Resolver<ButtonFormValues>,
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      button
        ? {
            code: button.code,
            name: button.name,
            description: button.description ?? '',
          }
        : emptyValues
    )
  }, [open, button, form])

  const onSubmit = (values: ButtonFormValues) => {
    const description = values.description?.trim()
      ? values.description.trim()
      : null

    if (button) {
      updateMutation.mutate(
        {
          id: button.id,
          name: values.name,
          description,
          // Code is locked server-side for system buttons.
          ...(isSystem ? {} : { code: values.code }),
        },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }

    createMutation.mutate(
      { code: values.code, name: values.name, description },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !isPending && onOpenChange(value)}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{button ? 'Edit button' : 'Create button'}</DialogTitle>
          <DialogDescription>
            {button
              ? 'Update the permission button. Code is locked for system buttons.'
              : 'Define a reusable action button that screens can activate.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='approve'
                      disabled={isSystem}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Combined with a screen code it becomes the permission name,
                    e.g. <code>orders.approve</code>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Approve' {...field} />
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
                {button ? 'Save changes' : 'Create button'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
