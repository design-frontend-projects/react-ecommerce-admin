// ResPOS Payments Page
import { CreditCard, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { usePaymentMethods } from '../api/queries'

export function Payments() {
  const { data: paymentMethods, isLoading } = usePaymentMethods()

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <CreditCard className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Payments</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {isLoading ? (
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Configure accepted payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentMethods && paymentMethods.length > 0 ? (
                  <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className='flex items-center gap-3 rounded-lg border p-4'
                      >
                        <CreditCard className='h-5 w-5' />
                        <div>
                          <p className='font-medium'>{method.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            {method.is_enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground'>
                    No payment methods configured yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Main>
    </>
  )
}
