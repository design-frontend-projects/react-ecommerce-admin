import { Link } from '@tanstack/react-router'
import { useTranslation, Trans } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { t } = useTranslation()
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('signUp.title')}
          </CardTitle>
          <CardDescription>
            {t('signUp.subtitle')} <br />
            {t('signUp.alreadyHaveAccount')}{' '}
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('signUp.signIn')}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            <Trans
              i18nKey='signUp.termsAgreement'
              components={{
                1: (
                  <a
                    href='/terms'
                    className='underline underline-offset-4 hover:text-primary'
                  />
                ),
                3: (
                  <a
                    href='/privacy'
                    className='underline underline-offset-4 hover:text-primary'
                  />
                ),
              }}
            />
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
