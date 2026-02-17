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
      <ProfileDropdown />
      <Card className='w-full border-border/50 bg-background/60 p-2 shadow-xl backdrop-blur-xl sm:max-w-md sm:p-4'>
        <CardHeader className='space-y-1 text-center'>
          <CardTitle className='text-3xl font-extrabold tracking-tight sm:text-4xl'>
            Welcome Back
          </CardTitle>
          <CardDescription className='text-muted-foreground sm:text-lg'>
            Choose your module and sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className='p-4 pt-0 sm:p-6'>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter className='flex flex-col space-y-4 p-4 sm:p-6'>
          <Link
            to='/sign-up'
            className='text-sm font-medium transition-colors hover:text-primary'
          >
            Don't have an account?{' '}
            <span className='text-primary underline underline-offset-4'>
              Sign Up
            </span>
          </Link>
          <p className='px-4 text-center text-xs text-muted-foreground sm:px-8'>
            By clicking sign in, you agree to our{' '}
            <a
              href='/terms'
              className='font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary'
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
