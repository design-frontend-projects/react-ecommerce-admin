import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export interface SubscriptionPlan {
  id: string | number
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  isPopular?: boolean
}

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan
  isSelected: boolean
  onSelect: (plan: SubscriptionPlan) => void
  isLoading?: boolean
}

export function SubscriptionPlanCard({
  plan,
  isSelected,
  onSelect,
  isLoading,
}: SubscriptionPlanCardProps) {
  const { t, i18n } = useTranslation()

  const planName = t(`subscription.plans.${plan.id}.name`, {
    defaultValue: plan.name,
  })
  const planDescription = t(`subscription.plans.${plan.id}.description`, {
    defaultValue: plan.description,
  })
  const planFeatures = t(`subscription.plans.${plan.id}.features`, {
    returnObjects: true,
    defaultValue: plan.features,
  }) as string[]

  const formattedPrice = new Intl.NumberFormat(
    i18n.language === 'ar' ? 'ar-EG' : 'en-US',
    {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }
  ).format(plan.price)

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className='h-full'
    >
      <Card
        className={cn(
          'relative flex h-full cursor-pointer flex-col transition-all duration-200',
          isSelected
            ? 'border-primary shadow-md ring-1 ring-primary'
            : 'hover:border-primary/50',
          plan.isPopular && 'border-primary/50'
        )}
        onClick={() => onSelect(plan)}
      >
        {plan.isPopular && (
          <div className='absolute top-0 right-0 translate-x-1/4 -translate-y-1/2'>
            <span className='rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm'>
              {t('subscription.card.popular', { defaultValue: 'Popular' })}
            </span>
          </div>
        )}
        <CardHeader>
          <CardTitle className='text-xl'>{planName}</CardTitle>
          <CardDescription className='min-h-[40px]'>
            {planDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex-1'>
          <div className='mb-6 flex items-baseline text-3xl font-bold'>
            {formattedPrice}
            <span className='ml-1 text-sm font-normal text-muted-foreground'>
              /
              {plan.interval === 'month'
                ? t('subscription.modal.intervalMonth')
                : t('subscription.modal.intervalYear')}
            </span>
          </div>
          <ul className='space-y-3'>
            {planFeatures.map((feature, i) => (
              <li key={i} className='flex items-start text-sm'>
                <Check className='mt-0.5 mr-2 h-4 w-4 shrink-0 text-primary' />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className='w-full'
            variant={isSelected ? 'default' : 'outline'}
            disabled={isLoading}
          >
            {isSelected
              ? t('subscription.card.selected', { defaultValue: 'Selected' })
              : t('subscription.card.selectPlan', {
                  defaultValue: 'Select Plan',
                })}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
