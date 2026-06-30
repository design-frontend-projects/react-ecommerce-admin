import { Link, useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { OtpForm } from './components/otp-form'

export function Otp() {
  const { flow } = useSearch({ from: '/(auth)/otp' })

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-base tracking-tight'>
            {flow === 'sign-in'
              ? 'Email Verification'
              : 'Two-factor Authentication'}
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to your email or phone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OtpForm flow={flow ?? 'sign-up'} />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            Haven&apos;t received it?{' '}
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              Resend a new code.
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
