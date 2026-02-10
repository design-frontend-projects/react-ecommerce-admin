import { useEffect } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isSignedIn) {
      navigate({ to: redirect || '/' })
    }
  }, [isSignedIn, navigate, redirect])

  return (
    <AuthLayout>
      <Card className='w-full max-w-md gap-4'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold tracking-tight'>
            Welcome Back
          </CardTitle>
          <CardDescription className='text-base'>
            Choose your module and sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter className='flex flex-col'>
          {/* add sign up routing  */}
          <Link
            to='/sign-up'
            className='mb-3 underline underline-offset-4 hover:text-primary'
          >
            Don't have an account? Sign Up
          </Link>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            By clicking sign in, you agree to our{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
