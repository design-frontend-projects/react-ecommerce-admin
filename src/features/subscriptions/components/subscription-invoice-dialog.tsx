import { format } from 'date-fns'
import { CheckCircle2, Download, Printer, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { TenantSubscriptionRecord } from '../types'
import { formatCurrencyAmount } from './subscription-preview-dialog'

interface SubscriptionInvoiceDialogProps {
  subscription: TenantSubscriptionRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubscriptionInvoiceDialog({
  subscription,
  open,
  onOpenChange,
}: SubscriptionInvoiceDialogProps) {
  const { t } = useTranslation()

  if (!subscription) return null

  const plan = subscription.subscriptions
  const invoiceNum = `INV-${subscription.transfer_ref || subscription.id.slice(0, 8).toUpperCase()}`
  const invoiceDate = subscription.start_date
    ? format(new Date(subscription.start_date), 'PPP')
    : format(new Date(), 'PPP')

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl print:m-0 print:max-w-none print:p-0'>
        <DialogHeader className='text-start border-b pb-4'>
          <div className='flex items-center justify-between gap-2'>
            <DialogTitle className='flex items-center gap-2 text-xl font-bold'>
              <Receipt className='h-5 w-5 text-primary' />
              <span>
                {t('subscriptions.invoice.title', {
                  defaultValue: 'Subscription Receipt & Tax Invoice',
                })}
              </span>
            </DialogTitle>
            <Badge
              variant='default'
              className='bg-emerald-600 text-white gap-1'
            >
              <CheckCircle2 className='h-3 w-3' />
              {subscription.status.toUpperCase()}
            </Badge>
          </div>
          <DialogDescription>
            {t('subscriptions.invoice.subtitle', {
              defaultValue:
                'Official billing transaction receipt for tenant subscription.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5 py-3 text-sm'>
          {/* Metadata Grid */}
          <div className='grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4'>
            <div>
              <div className='text-xs text-muted-foreground'>
                {t('subscriptions.invoice.invoiceNumber', {
                  defaultValue: 'Invoice #',
                })}
              </div>
              <div className='font-mono font-bold mt-0.5'>{invoiceNum}</div>
            </div>
            <div>
              <div className='text-xs text-muted-foreground'>
                {t('subscriptions.invoice.receiptDate', {
                  defaultValue: 'Receipt Date',
                })}
              </div>
              <div className='font-medium mt-0.5'>{invoiceDate}</div>
            </div>
            <div>
              <div className='text-xs text-muted-foreground'>
                {t('subscriptions.invoice.billingTo', {
                  defaultValue: 'Billed To',
                })}
              </div>
              <div className='font-medium mt-0.5'>
                {subscription.first_name || subscription.last_name
                  ? `${subscription.first_name || ''} ${subscription.last_name || ''}`.trim()
                  : subscription.email}
              </div>
              <div className='text-xs text-muted-foreground'>
                {subscription.email}
              </div>
            </div>
            <div>
              <div className='text-xs text-muted-foreground'>
                {t('subscriptions.invoice.paymentMethod', {
                  defaultValue: 'Payment Method',
                })}
              </div>
              <div className='font-medium capitalize mt-0.5'>
                {subscription.payment_method || 'Credit Card'}
              </div>
              {subscription.transfer_ref && (
                <div className='text-xs text-muted-foreground font-mono'>
                  Ref: {subscription.transfer_ref}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div className='space-y-2'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              {t('subscriptions.invoice.planDetails', {
                defaultValue: 'Subscription Plan Details',
              })}
            </h4>
            <div className='rounded-lg border overflow-hidden'>
              <div className='grid grid-cols-12 bg-muted/40 p-2.5 text-xs font-medium text-muted-foreground'>
                <div className='col-span-7'>Description</div>
                <div className='col-span-2 text-center'>Interval</div>
                <div className='col-span-3 text-end'>Amount</div>
              </div>
              <div className='grid grid-cols-12 p-3 text-sm items-center border-t'>
                <div className='col-span-7 font-medium'>
                  <div>{plan?.name || 'Platform Subscription Plan'}</div>
                  {plan?.tier && (
                    <div className='text-xs text-muted-foreground capitalize'>
                      Tier: {plan.tier.replace('_', ' ')}
                    </div>
                  )}
                </div>
                <div className='col-span-2 text-center text-xs text-muted-foreground capitalize'>
                  {plan?.billing_interval || 'Monthly'}
                </div>
                <div className='col-span-3 text-end font-mono font-medium'>
                  {formatCurrencyAmount(
                    subscription.price_at_purchase,
                    subscription.currency
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className='rounded-lg border bg-muted/10 p-4 space-y-2'>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>
                {t('subscriptions.invoice.subtotal', {
                  defaultValue: 'Subtotal',
                })}
              </span>
              <span className='font-mono'>
                {formatCurrencyAmount(
                  subscription.price_at_purchase,
                  subscription.currency
                )}
              </span>
            </div>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>
                {t('subscriptions.invoice.tax', { defaultValue: 'VAT / Tax' })} (0%)
              </span>
              <span className='font-mono'>0.00 {subscription.currency || 'LE'}</span>
            </div>
            <Separator />
            <div className='flex justify-between text-base font-bold text-foreground pt-1'>
              <span>
                {t('subscriptions.invoice.totalPaid', {
                  defaultValue: 'Total Amount Paid',
                })}
              </span>
              <span className='font-mono text-primary'>
                {formatCurrencyAmount(
                  subscription.price_at_purchase,
                  subscription.currency
                )}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 pt-2 print:hidden'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
          >
            {t('subscriptions.invoice.close', { defaultValue: 'Close' })}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handlePrint}
            className='gap-1.5'
          >
            <Printer className='h-3.5 w-3.5' />
            <span>
              {t('subscriptions.invoice.print', {
                defaultValue: 'Print Receipt',
              })}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

