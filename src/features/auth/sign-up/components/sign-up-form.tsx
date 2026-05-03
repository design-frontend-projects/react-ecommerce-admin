import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { signUpFormSchema, type SignUpFormValues } from './sign-up.schema'
import { savePendingOtpRequest } from '../../otp/pending-otp'

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      contactType: 'email',
      contact: '',
    },
  })

  async function onSubmit(data: SignUpFormValues) {
    setIsLoading(true)

    try {
      const payload =
        data.contactType === 'email'
          ? { email: data.contact.trim().toLowerCase() }
          : { phone: data.contact.trim() }

      const { error } = await supabase.auth.signInWithOtp(payload)
      if (error) throw error

      savePendingOtpRequest({
        contactType: data.contactType,
        contact: data.contact.trim(),
        flow: 'sign-up',
      })

      navigate({ to: '/otp' })
      toast.success('Verification code sent.')
    } catch (err: unknown) {
      const errorMsg =
        (err as { errors?: { message: string }[] })?.errors?.[0]?.message ||
        (err as { message?: string })?.message ||
        'Something went wrong. Please try again.'
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='contact'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center justify-between gap-3'>
                <FormLabel>
                  {form.watch('contactType') === 'email' ? 'Email' : 'Phone'}
                </FormLabel>
                <FormField
                  control={form.control}
                  name='contactType'
                  render={({ field: typeField }) => (
                    <div className='grid grid-cols-2 rounded-lg bg-muted p-1 text-xs'>
                      {(['email', 'phone'] as const).map((type) => (
                        <button
                          key={type}
                          type='button'
                          onClick={() => typeField.onChange(type)}
                          className={cn(
                            'rounded-md px-3 py-1 font-medium capitalize transition-colors',
                            typeField.value === type
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>
              <FormControl>
                <Input
                  placeholder={
                    form.watch('contactType') === 'email'
                      ? 'name@example.com'
                      : '+201000000000'
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          Send verification code
        </Button>

        <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background px-2 text-muted-foreground'>
              Or continue with
            </span>
          </div>
        </div>
      </form>
    </Form>
  )
}
