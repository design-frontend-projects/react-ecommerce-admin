import { useState } from 'react'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { useSubscriptionPlans, useAssignSubscription } from '../queries'
import {
  SubscriptionPlanCard,
  type SubscriptionPlan,
} from './subscription-plan-card'

interface SubscriptionFlowProps {
  onSuccess?: () => void
}

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro_monthly',
    name: 'Pro Hàng Tháng',
    description: 'Dành cho quán ăn vừa và nhỏ',
    price: 199000,
    interval: 'month',
    features: [
      'Quản lý tối đa 50 bàn',
      'Báo cáo doanh thu cơ bản',
      'Hỗ trợ qua email',
      'Tích hợp thanh toán QR',
    ],
  },
  {
    id: 'premium_yearly',
    name: 'Cao cấp Hàng Năm',
    description: 'Giải pháp toàn diện cho chuỗi nhà hàng',
    price: 1990000,
    interval: 'year',
    isPopular: true,
    features: [
      'Quản lý không giới hạn số bàn',
      'Báo cáo chuyên sâu & dự báo',
      'Hỗ trợ ưu tiên 24/7',
      'Tích hợp CRM & Marketing',
      'Tiết kiệm 20% so với gói tháng',
    ],
  },
]

export function SubscriptionFlow({ onSuccess }: SubscriptionFlowProps) {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuthStore((state) => state.auth)
  const { data: dbPlans, isLoading: isLoadingPlans } = useSubscriptionPlans()
  const { mutateAsync: assignSubscription } = useAssignSubscription()

  const plans: SubscriptionPlan[] =
    dbPlans?.map((p) => ({
      id: p.id,
      name: p.name,
      description:
        p.duration_months === 1
          ? 'Dành cho quán ăn vừa và nhỏ'
          : 'Giải pháp toàn diện cho chuỗi nhà hàng',
      price: Number(p.price),
      interval: p.duration_months === 1 ? 'month' : 'year',
      features:
        MOCK_PLANS.find(
          (m) => m.interval === (p.duration_months === 1 ? 'month' : 'year')
        )?.features || [],
      isPopular: p.duration_months > 1,
    })) || MOCK_PLANS // Fallback to MOCK_PLANS if db fetch fails or is empty

  const [step, setStep] = useState<'choose' | 'pay' | 'success'>('choose')
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderCode] = useState(() => Math.floor(Math.random() * 100000))

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
  }

  const handleNext = async () => {
    if (step === 'choose' && selectedPlan) {
      setIsProcessing(true)
      try {
        if (user) {
          const startDate = new Date()
          const endDate = new Date()
          if (selectedPlan.interval === 'year') {
            endDate.setFullYear(endDate.getFullYear() + 1)
          } else {
            endDate.setMonth(endDate.getMonth() + 1)
          }

          const result = await assignSubscription({
            auth_user_id: user.id,
            email: user.email ?? profile?.email ?? '',
            first_name:
              profile?.first_name ?? user.user_metadata?.first_name ?? '',
            last_name:
              profile?.last_name ?? user.user_metadata?.last_name ?? '',
            is_owner: true,
            subscription_id:
              typeof selectedPlan.id === 'number' ? selectedPlan.id : 1,
            status: 'paid',
            start_date: startDate,
            end_date: endDate,
          })

          if (result?.isExtension) {
            toast.success(
              `Active subscription extended! Total duration is now ${result.totalMonths} months.`
            )
          } else {
            toast.success('Subscription activated successfully!')
          }
        }

        setIsProcessing(false)
        setStep('success')

        // Auto close sau thành công
        setTimeout(() => {
          onSuccess?.()
          // Reset
          setTimeout(() => {
            setStep('choose')
            setSelectedPlan(null)
          }, 500)
        }, 2000)
      } catch (error) {
        setIsProcessing(false)
        toast.error('Failed to activate subscription. Please try again.')
      }
    }
  }

  const handleBack = () => setStep('choose')
  const handlePayment = handleNext

  const formattedPrice = selectedPlan
    ? new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(selectedPlan.price)
    : ''

  return (
    <Card className='mx-auto w-full max-w-4xl overflow-hidden border-white/10 bg-slate-950/40 shadow-2xl backdrop-blur-md'>
      <CardContent className='p-6 sm:p-8'>
        {step === 'choose' && (
          <div className='flex flex-col'>
            <CardHeader className='px-0 pt-0 text-center sm:text-left'>
              <CardTitle className='text-2xl text-white'>
                {t('subscription.modal.title')}
              </CardTitle>
              <CardDescription className='text-slate-400'>
                {t('subscription.modal.description')}
              </CardDescription>
            </CardHeader>
            <div className='my-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
              {isLoadingPlans ? (
                <div className='col-span-1 flex justify-center py-12 md:col-span-2'>
                  <Loader2 className='h-8 w-8 animate-spin text-primary' />
                </div>
              ) : (
                plans.map((plan) => (
                  <SubscriptionPlanCard
                    key={plan.id}
                    plan={plan}
                    isSelected={selectedPlan?.id === plan.id}
                    onSelect={handlePlanSelect}
                  />
                ))
              )}
            </div>
            <CardFooter className='flex flex-col items-center justify-between gap-4 px-0 pb-0 sm:flex-row'>
              <p className='text-center text-sm text-slate-400 sm:text-left'>
                {t('subscription.modal.cancelOrChange')}
              </p>
              <Button
                onClick={handleNext}
                disabled={!selectedPlan || isProcessing}
                className='w-full sm:w-auto'
              >
                {isProcessing && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {t('subscription.modal.continue')}{' '}
                {!isProcessing && <ArrowRight className='ml-2 h-4 w-4' />}
              </Button>
            </CardFooter>
          </div>
        )}

        {step === 'pay' && selectedPlan && (
          <div className='flex flex-col'>
            <CardHeader className='px-0 pt-0 text-center sm:text-left'>
              <CardTitle className='text-2xl text-white'>
                {t('subscription.modal.paymentTitle')}
              </CardTitle>
              <CardDescription className='text-slate-400'>
                {t('subscription.modal.paymentDescription', {
                  planName: t(`subscription.plans.${selectedPlan.id}.name`, {
                    defaultValue: selectedPlan.name,
                  }),
                  price: formattedPrice,
                  interval:
                    selectedPlan.interval === 'month'
                      ? t('subscription.modal.intervalMonth')
                      : t('subscription.modal.intervalYear'),
                })}
              </CardDescription>
            </CardHeader>

            <div className='flex flex-col items-center justify-center space-y-4 py-12 text-center'>
              <div className='w-full max-w-sm rounded-lg bg-muted p-6'>
                <h3 className='mb-2 text-lg font-semibold'>
                  {t('subscription.modal.demoPaymentTitle')}
                </h3>
                <p className='mb-4 text-sm text-muted-foreground'>
                  {t('subscription.modal.demoPaymentDescription')}
                </p>
                <div className='mb-4 flex items-center justify-between rounded border bg-background p-3 font-mono text-sm'>
                  <span>{t('subscription.modal.orderCode')}</span>
                  <span className='font-bold'>SUB-{orderCode}</span>
                </div>
              </div>
            </div>

            <CardFooter className='flex flex-col-reverse gap-4 px-0 pb-0 sm:flex-row sm:justify-between'>
              <Button
                variant='outline'
                onClick={handleBack}
                disabled={isProcessing}
                className='w-full border-white/10 text-white hover:bg-white/10 hover:text-white sm:w-auto'
              >
                {t('subscription.modal.back')}
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className='w-full sm:w-auto'
              >
                {isProcessing && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {t('subscription.modal.confirmPayment')}
              </Button>
            </CardFooter>
          </div>
        )}

        {step === 'success' && (
          <div className='flex flex-col items-center justify-center space-y-4 py-12 text-center'>
            <div className='rounded-full bg-green-500/20 p-3'>
              <CheckCircle2 className='h-12 w-12 text-green-500' />
            </div>
            <h2 className='text-2xl font-bold text-white'>
              {t('subscription.modal.successTitle')}
            </h2>
            <p className='text-slate-400'>
              {t('subscription.modal.successDescription')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
