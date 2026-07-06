import { useState } from 'react'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  SubscriptionPlanCard,
  type SubscriptionPlan,
} from './subscription-plan-card'
import { useSubscriptionPlans, useAssignSubscription } from '../queries'
import { useAuthStore } from '@/stores/auth-store'

interface SubscriptionModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
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

export function SubscriptionModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: SubscriptionModalProps) {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuthStore((state) => state.auth)
  const { data: dbPlans, isLoading: isLoadingPlans } = useSubscriptionPlans()
  const { mutateAsync: assignSubscription } = useAssignSubscription()

  const plans: SubscriptionPlan[] = dbPlans?.map(p => ({
    id: p.id,
    name: p.name,
    description: p.duration_months === 1 ? 'Dành cho quán ăn vừa và nhỏ' : 'Giải pháp toàn diện cho chuỗi nhà hàng',
    price: Number(p.price),
    interval: p.duration_months === 1 ? 'month' : 'year',
    features: MOCK_PLANS.find(m => m.interval === (p.duration_months === 1 ? 'month' : 'year'))?.features || [],
    isPopular: p.duration_months > 1,
  })) || MOCK_PLANS // Fallback to MOCK_PLANS if db fetch fails or is empty

  const [step, setStep] = useState<'choose' | 'pay' | 'success'>('choose')
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderCode, setOrderCode] = useState(() =>
    Math.floor(Math.random() * 100000)
  )

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
  }

  const handleNext = () => {
    if (step === 'choose' && selectedPlan) {
      setStep('pay')
      setOrderCode(Math.floor(Math.random() * 100000))
    }
  }

  const handleBack = () => {
    if (step === 'pay') {
      setStep('choose')
    }
  }

  const handlePayment = async () => {
    setIsProcessing(true)
    try {
      // Giả lập payment process
      await new Promise((resolve) => setTimeout(resolve, 2000))
      
      // After mock payment, record the subscription in the database
      if (user && selectedPlan) {
        const startDate = new Date()
        const endDate = new Date()
        if (selectedPlan.interval === 'year') {
          endDate.setFullYear(endDate.getFullYear() + 1)
        } else {
          endDate.setMonth(endDate.getMonth() + 1)
        }
        
        await assignSubscription({
          auth_user_id: user.id,
          email: user.email ?? profile?.email ?? '',
          first_name: profile?.first_name ?? user.user_metadata?.first_name ?? '',
          last_name: profile?.last_name ?? user.user_metadata?.last_name ?? '',
          is_owner: true,
          subscription_id: typeof selectedPlan.id === 'number' ? selectedPlan.id : 1, // Fallback if still using mock string id
          status: 'paid',
          start_date: startDate,
          end_date: endDate
        })
      }

      setIsProcessing(false)
      setStep('success')

      // Auto close sau thành công
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
        // Reset khi mở lại
        setTimeout(() => {
          setStep('choose')
          setSelectedPlan(null)
        }, 500)
      }, 2000)
    } catch (error) {
      console.error('Subscription failed', error)
      setIsProcessing(false)
    }
  }

  const formattedPrice = selectedPlan
    ? new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(selectedPlan.price)
    : ''

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='overflow-hidden sm:max-w-[800px]'>
        {step === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle className='text-2xl'>
                {t('subscription.modal.title')}
              </DialogTitle>
              <DialogDescription>
                {t('subscription.modal.description')}
              </DialogDescription>
            </DialogHeader>
            <div className='my-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
              {isLoadingPlans ? (
                <div className='col-span-1 md:col-span-2 flex justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-primary' />
                </div>
              ) : plans.map((plan) => (
                <SubscriptionPlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={selectedPlan?.id === plan.id}
                  onSelect={handlePlanSelect}
                />
              ))}
            </div>
            <DialogFooter className='flex items-center justify-between sm:justify-between'>
              <p className='mr-auto text-left text-sm text-muted-foreground'>
                {t('subscription.modal.cancelOrChange')}
              </p>
              <Button
                onClick={handleNext}
                disabled={!selectedPlan}
                className='mt-4 w-full sm:mt-0 sm:w-auto'
              >
                {t('subscription.modal.continue')}{' '}
                <ArrowRight className='ml-2 h-4 w-4' />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'pay' && selectedPlan && (
          <>
            <DialogHeader>
              <DialogTitle className='text-2xl'>
                {t('subscription.modal.paymentTitle')}
              </DialogTitle>
              <DialogDescription>
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
              </DialogDescription>
            </DialogHeader>

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

            <DialogFooter className='flex sm:justify-between'>
              <Button
                variant='outline'
                onClick={handleBack}
                disabled={isProcessing}
              >
                {t('subscription.modal.back')}
              </Button>
              <Button onClick={handlePayment} disabled={isProcessing}>
                {isProcessing && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {t('subscription.modal.confirmPayment')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <div className='flex animate-in flex-col items-center justify-center space-y-4 py-16 text-center duration-300 zoom-in'>
            <div className='mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100'>
              <CheckCircle2 className='h-10 w-10 text-green-600' />
            </div>
            <DialogTitle className='text-2xl text-green-600'>
              {t('subscription.modal.successTitle')}
            </DialogTitle>
            <DialogDescription className='text-base'>
              {t('subscription.modal.successDescription', {
                planName: selectedPlan
                  ? t(`subscription.plans.${selectedPlan.id}.name`, {
                      defaultValue: selectedPlan.name,
                    })
                  : '',
              })}
            </DialogDescription>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
