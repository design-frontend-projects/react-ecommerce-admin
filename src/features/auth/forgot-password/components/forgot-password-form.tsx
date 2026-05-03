import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function ForgotPasswordForm() {
  return (
    <div className='grid gap-4 text-sm text-muted-foreground'>
      <p>
        Password sign-in has been replaced with one-time codes. Use your email
        or phone on the sign-in screen and we will send a fresh code.
      </p>
      <Button asChild>
        <Link to='/sign-in'>Back to sign in</Link>
      </Button>
    </div>
  )
}
