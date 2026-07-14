import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { RBACGuard } from '@/features/users/components/rbac-guard'
import { PaymentMethodsDialogs } from './components/payment-methods-dialogs'
import { PaymentMethodsPrimaryButtons } from './components/payment-methods-primary-buttons'
import { PaymentMethodsProvider } from './components/payment-methods-provider'
import { PaymentMethodsTable } from './components/payment-methods-table'
import { usePaymentMethods } from './hooks/use-payment-methods'

export function PaymentMethods() {
  const { t } = useTranslation()
  const { data: paymentMethods, isLoading, error } = usePaymentMethods()

  return (
    <RBACGuard
      resource='payment_methods'
      action='read'
      fallback={
        <Main className='flex flex-1 items-center justify-center'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('paymentMethods.accessDenied', 'Access Denied')}
            </h2>
            <p className='text-muted-foreground'>
              {t(
                'paymentMethods.noPermission',
                'You do not have permission to view payment methods.'
              )}
            </p>
          </div>
        </Main>
      }
    >
      <PaymentMethodsProvider>
        <Header fixed>
          <Search />
          <div className='ms-auto flex items-center space-x-4'>
            <LanguageSwitch />
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>

        <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
          <div className='flex flex-wrap items-end justify-between gap-2'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                {t('paymentMethods.title', 'Payment Methods')}
              </h2>
              <p className='text-muted-foreground'>
                {t('paymentMethods.subtitle', 'Manage your payment methods.')}
              </p>
            </div>
            <PaymentMethodsPrimaryButtons />
          </div>

          {isLoading ? (
            <div className='flex flex-1 items-center justify-center'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
            </div>
          ) : error ? (
            <div className='text-destructive'>
              {t('paymentMethods.loadError', 'Error loading payment methods')}
            </div>
          ) : (
            <PaymentMethodsTable data={paymentMethods || []} />
          )}
        </Main>

        <PaymentMethodsDialogs />
      </PaymentMethodsProvider>
    </RBACGuard>
  )
}
