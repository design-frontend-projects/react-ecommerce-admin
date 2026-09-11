import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Tag,
  CreditCard,
  Edit,
  Trash2,
  Plus,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useCustomerCards,
  useCreateCustomerCard,
  useDeleteCustomerCard,
} from '../hooks/use-customers'
import { useCustomersContext } from './customers-provider'

export function CustomerDetailSheet() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useCustomersContext()
  const isOpen = open === 'view' && !!currentRow

  const { data: cards, isLoading: cardsLoading } = useCustomerCards(currentRow?.id)
  const createCardMutation = useCreateCustomerCard()
  const deleteCardMutation = useDeleteCustomerCard()

  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isAddCardOpen, setIsAddCardOpen] = useState(false)

  // Card form state
  const [cardholderName, setCardholderName] = useState('')
  const [lastFour, setLastFour] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('12')
  const [expiryYear, setExpiryYear] = useState(String(new Date().getFullYear() + 2))
  const [cardType, setCardType] = useState('Visa')
  const [isDefault, setIsDefault] = useState(false)

  if (!currentRow) return null

  const fullName = `${currentRow.first_name} ${currentRow.last_name}`
  const initials = `${currentRow.first_name[0] || ''}${currentRow.last_name[0] || ''}`.toUpperCase()

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    toast.success(`${fieldName} ${t('common.copied', 'copied to clipboard')}`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentRow.id || lastFour.length !== 4) {
      toast.error(t('customers.validation.invalidCard', 'Please enter 4 digits for the card.'))
      return
    }

    try {
      await createCardMutation.mutateAsync({
        customer_id: currentRow.id,
        cardholder_name: cardholderName || fullName,
        last_four_digits: lastFour,
        expiry_month: parseInt(expiryMonth, 10),
        expiry_year: parseInt(expiryYear, 10),
        card_type: cardType,
        is_default: isDefault,
      })
      toast.success(t('customers.toast.cardAdded', 'Card added successfully'))
      setIsAddCardOpen(false)
      setLastFour('')
      setCardholderName('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add card')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteCardMutation.mutateAsync({ cardId, customerId: currentRow.id })
      toast.success(t('customers.toast.cardDeleted', 'Card deleted successfully'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete card')
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className='w-full sm:max-w-xl overflow-y-auto p-0'>
          {/* Header Banner */}
          <div className='relative bg-gradient-to-br from-primary/15 via-primary/5 to-muted p-6 pb-5 border-b'>
            <SheetHeader className='space-y-0 text-left'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-3.5'>
                  <Avatar className='h-16 w-16 border-2 border-background shadow-sm text-lg font-bold'>
                    <AvatarFallback className='bg-primary/20 text-primary font-bold'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <SheetTitle className='text-xl font-bold tracking-tight'>
                        {fullName}
                      </SheetTitle>
                      {currentRow.is_active ? (
                        <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-semibold'>
                          {t('common.active', 'Active')}
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='bg-muted text-muted-foreground text-xs'>
                          {t('common.inactive', 'Inactive')}
                        </Badge>
                      )}
                    </div>
                    {currentRow.code && (
                      <div className='flex items-center gap-1.5'>
                        <Badge variant='secondary' className='font-mono text-xs'>
                          {currentRow.code}
                        </Badge>
                        <button
                          type='button'
                          onClick={() => copyToClipboard(currentRow.code!, 'Code')}
                          className='text-muted-foreground hover:text-foreground'
                        >
                          {copiedField === 'Code' ? (
                            <Check className='h-3 w-3 text-emerald-500' />
                          ) : (
                            <Copy className='h-3 w-3' />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  size='sm'
                  variant='outline'
                  className='gap-1.5 shrink-0'
                  onClick={() => setOpen('edit')}
                >
                  <Edit className='h-3.5 w-3.5' />
                  <span>{t('common.edit', 'Edit')}</span>
                </Button>
              </div>
              <SheetDescription className='sr-only'>
                {t('customers.sheet.subtitle', 'Comprehensive 360 overview of customer account details')}
              </SheetDescription>
            </SheetHeader>

            {/* Quick Contact bar */}
            <div className='mt-4 flex flex-wrap gap-2'>
              {currentRow.phone && (
                <Button
                  size='xs'
                  variant='secondary'
                  className='gap-1.5 h-8 text-xs'
                  asChild
                >
                  <a href={`tel:${currentRow.phone}`}>
                    <Phone className='h-3.5 w-3.5 text-primary' />
                    <span>{currentRow.phone}</span>
                  </a>
                </Button>
              )}
              {currentRow.email && (
                <Button
                  size='xs'
                  variant='secondary'
                  className='gap-1.5 h-8 text-xs'
                  asChild
                >
                  <a href={`mailto:${currentRow.email}`}>
                    <Mail className='h-3.5 w-3.5 text-primary' />
                    <span>{currentRow.email}</span>
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className='p-6 space-y-6'>
            {/* Membership & Loyalty Tier */}
            <div className='space-y-3'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4 text-primary' />
                <span>{t('customers.sheet.groupAndLoyalty', 'Membership & Loyalty')}</span>
              </h4>
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <span className='text-xs text-muted-foreground flex items-center gap-1'>
                    <Tag className='h-3 w-3 text-primary' />
                    {t('customers.columns.group', 'Customer Group')}
                  </span>
                  <div className='font-semibold text-sm'>
                    {currentRow.customer_groups?.name || (
                      <span className='text-muted-foreground font-normal italic'>
                        {t('customers.form.noGroup', 'No group assigned')}
                      </span>
                    )}
                  </div>
                  {currentRow.customer_groups?.discount_percentage != null &&
                    Number(currentRow.customer_groups.discount_percentage) > 0 && (
                      <Badge variant='outline' className='mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-semibold'>
                        {Number(currentRow.customer_groups.discount_percentage)}% {t('customers.sheet.discount', 'Discount')}
                      </Badge>
                    )}
                </div>

                <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                  <span className='text-xs text-muted-foreground flex items-center gap-1'>
                    <Star className='h-3 w-3 text-amber-500 fill-amber-500' />
                    {t('customers.columns.loyaltyPoints', 'Loyalty Balance')}
                  </span>
                  <div className='text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400'>
                    {currentRow.loyalty_points || 0}{' '}
                    <span className='text-xs font-medium text-muted-foreground'>
                      {t('customers.sheet.points', 'pts')}
                    </span>
                  </div>
                  <span className='text-[11px] text-muted-foreground'>
                    {t('customers.sheet.loyaltyRewardDesc', 'Redeemable at checkout')}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Address & Location */}
            <div className='space-y-3'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                <MapPin className='h-4 w-4 text-primary' />
                <span>{t('customers.sheet.addressInfo', 'Address & Location')}</span>
              </h4>
              <div className='rounded-lg border bg-card p-4 space-y-2 text-sm'>
                {currentRow.address_line1 || currentRow.city || currentRow.country ? (
                  <>
                    {currentRow.address_line1 && (
                      <div className='font-medium text-foreground'>{currentRow.address_line1}</div>
                    )}
                    {currentRow.address_line2 && (
                      <div className='text-muted-foreground text-xs'>{currentRow.address_line2}</div>
                    )}
                    <div className='text-xs text-muted-foreground flex flex-wrap gap-x-2 pt-1'>
                      {currentRow.city && <span>{currentRow.city}</span>}
                      {currentRow.state && <span>• {currentRow.state}</span>}
                      {currentRow.postal_code && <span>• {currentRow.postal_code}</span>}
                      {currentRow.country && (
                        <Badge variant='outline' className='text-[11px] ms-auto'>
                          {currentRow.country}
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <p className='text-xs text-muted-foreground italic'>
                    {t('common.noAddressProvided', 'No address provided')}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Saved Payment Cards */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                  <CreditCard className='h-4 w-4 text-primary' />
                  <span>{t('customers.sheet.paymentCards', 'Saved Payment Cards')}</span>
                </h4>
                <Button
                  size='xs'
                  variant='outline'
                  className='gap-1 h-7 text-xs'
                  onClick={() => setIsAddCardOpen(true)}
                >
                  <Plus className='h-3 w-3' />
                  <span>{t('customers.sheet.addCard', 'Add Card')}</span>
                </Button>
              </div>

              {cardsLoading ? (
                <div className='p-4 text-center text-xs text-muted-foreground'>
                  {t('common.loading', 'Loading cards...')}
                </div>
              ) : cards && cards.length > 0 ? (
                <div className='space-y-2'>
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className='flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary font-bold text-xs'>
                          {card.card_type ? card.card_type.slice(0, 4) : 'CARD'}
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono font-medium text-sm'>
                              •••• •••• •••• {card.last_four_digits}
                            </span>
                            {card.is_default && (
                              <Badge variant='secondary' className='text-[10px] py-0'>
                                {t('customers.sheet.defaultCard', 'Default')}
                              </Badge>
                            )}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {card.cardholder_name} • {t('customers.sheet.expires', 'Exp')}:{' '}
                            {String(card.expiry_month).padStart(2, '0')}/{card.expiry_year}
                          </div>
                        </div>
                      </div>

                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-8 w-8 text-muted-foreground hover:text-destructive'
                        disabled={deleteCardMutation.isPending}
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-lg border border-dashed p-5 text-center'>
                  <CreditCard className='mx-auto h-7 w-7 text-muted-foreground/50' />
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {t('customers.sheet.noCards', 'No payment cards on file for this customer.')}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Account Timeline */}
            <div className='space-y-2 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <span>{t('customers.columns.joined', 'Joined Date')}</span>
                <span className='font-medium text-foreground flex items-center gap-1'>
                  <Calendar className='h-3.5 w-3.5' />
                  {new Date(currentRow.created_at).toLocaleDateString()}
                </span>
              </div>
              {currentRow.date_of_birth && (
                <div className='flex items-center justify-between'>
                  <span>{t('customers.form.dateOfBirth', 'Date of Birth')}</span>
                  <span className='font-medium text-foreground'>
                    {new Date(currentRow.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Card Modal */}
      <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>{t('customers.sheet.addCard', 'Add Payment Card')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCard} className='space-y-3.5 py-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='cardholder_name'>{t('customers.form.cardholderName', 'Cardholder Name')}</Label>
              <Input
                id='cardholder_name'
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder={fullName}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='card_type'>{t('customers.form.cardType', 'Card Brand')}</Label>
                <Input
                  id='card_type'
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  placeholder='Visa, Mastercard, etc.'
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='last_four'>{t('customers.form.lastFour', 'Last 4 Digits')}</Label>
                <Input
                  id='last_four'
                  maxLength={4}
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ''))}
                  placeholder='4242'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='expiry_month'>{t('customers.form.expiryMonth', 'Exp. Month')}</Label>
                <Input
                  id='expiry_month'
                  type='number'
                  min={1}
                  max={12}
                  value={expiryMonth}
                  onChange={(e) => setExpiryMonth(e.target.value)}
                  placeholder='MM'
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='expiry_year'>{t('customers.form.expiryYear', 'Exp. Year')}</Label>
                <Input
                  id='expiry_year'
                  type='number'
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 20}
                  value={expiryYear}
                  onChange={(e) => setExpiryYear(e.target.value)}
                  placeholder='YYYY'
                />
              </div>
            </div>
            <div className='flex items-center space-x-2 pt-1'>
              <Checkbox
                id='is_default_card'
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(!!v)}
              />
              <Label htmlFor='is_default_card' className='text-xs font-normal cursor-pointer'>
                {t('customers.form.isDefaultCard', 'Set as default payment card')}
              </Label>
            </div>
            <DialogFooter className='pt-2'>
              <Button type='button' variant='outline' onClick={() => setIsAddCardOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type='submit' disabled={createCardMutation.isPending}>
                {createCardMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
