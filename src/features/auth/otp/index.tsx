import { Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-base tracking-tight'>
            {flow === 'sign-in'
              ? t('otp.emailVerification')
              : t('otp.twoFactorAuth')}
          </CardTitle>
          <CardDescription>{t('otp.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <OtpForm flow={flow ?? 'sign-up'} />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            {t('otp.notReceived')}{' '}
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('otp.resendCode')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
