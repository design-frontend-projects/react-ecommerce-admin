import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Edit,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  Receipt,
  ShieldCheck,
  Star,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Can } from '@/components/rbac/Can'
import { type Supplier } from '../hooks/use-suppliers'
import { useSuppliersContext } from './suppliers-provider'

export function SupplierDetailsSheet() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useSuppliersContext()

  // Smooth exit transition cache: retain supplier data while sheet plays slide-out animation
  const [cachedSupplier, setCachedSupplier] = useState<Supplier | null>(currentRow)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (currentRow && currentRow !== cachedSupplier) {
    setCachedSupplier(currentRow)
  }

  const supplier = currentRow || cachedSupplier
  const isOpen = open === 'view' && !!currentRow

  if (!supplier) return null

  const isActive = supplier.is_active !== false
  const isPreferred = !!supplier.is_preferred
  const linkedProducts = supplier._count?.products ?? 0
  const linkedOrders = supplier._count?.purchase_orders ?? 0

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(label)
      toast.success(
        t('suppliers.details.copied', {
          field: label,
          defaultValue: `${label} copied to clipboard`,
        })
      )
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Format payment terms
  const formatPaymentTerms = (days?: number | null) => {
    if (days === undefined || days === null) {
      return t('suppliers.details.termsNotSpecified', { defaultValue: 'Not Specified' })
    }
    if (days === 0) {
      return t('suppliers.details.dueOnReceipt', { defaultValue: 'Due on Receipt (Cash / Immediate)' })
    }
    return `${days} ${t('common.days', { defaultValue: 'days' })}`
  }

  // Initials for avatar
  const initials =
    supplier.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || supplier.name.slice(0, 2).toUpperCase()

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <SheetContent
        side='right'
        className='w-full sm:max-w-lg md:max-w-xl p-0 flex flex-col h-full overflow-hidden'
      >
        {/* Top Header Banner with Brand Gradient */}
        <div className='relative bg-gradient-to-br from-primary/15 via-primary/5 to-muted/30 p-6 pb-5 border-b'>
          <SheetHeader className='space-y-0 text-start p-0'>
            <div className='text-xs font-semibold uppercase tracking-wider text-primary mb-2'>
              {t('suppliers.details.title', { defaultValue: 'Supplier Profile' })}
            </div>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex items-center gap-3.5 min-w-0'>
                <Avatar className='h-14 w-14 border-2 border-background shadow-xs text-base font-bold shrink-0'>
                  <AvatarFallback className='bg-primary/20 text-primary font-bold'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='space-y-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <SheetTitle className='text-xl font-bold tracking-tight text-foreground truncate'>
                      {supplier.name}
                    </SheetTitle>
                    {isPreferred && (
                      <Badge
                        variant='outline'
                        className='border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 text-xs font-semibold'
                      >
                        <Star className='h-3 w-3 fill-amber-500 text-amber-500' />
                        <span>{t('suppliers.columns.preferred', { defaultValue: 'Preferred' })}</span>
                      </Badge>
                    )}
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-xs font-semibold gap-1',
                        isActive
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-muted bg-muted/60 text-muted-foreground'
                      )}
                    >
                      {isActive ? (
                        <CheckCircle2 className='h-3 w-3' />
                      ) : (
                        <XCircle className='h-3 w-3' />
                      )}
                      <span>
                        {isActive
                          ? t('suppliers.table.activeOnly', { defaultValue: 'Active' })
                          : t('suppliers.table.inactiveOnly', { defaultValue: 'Inactive' })}
                      </span>
                    </Badge>
                  </div>

                  {supplier.code && (
                    <div className='flex items-center gap-1.5 pt-0.5'>
                      <Badge variant='secondary' className='font-mono text-xs font-medium'>
                        {supplier.code}
                      </Badge>
                      <button
                        type='button'
                        onClick={() => copyToClipboard(supplier.code!, 'Code')}
                        className='text-muted-foreground hover:text-foreground transition-colors p-0.5'
                        title={t('common.copy', { defaultValue: 'Copy' })}
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
            </div>

            <SheetDescription className='text-xs text-muted-foreground pt-2 text-start'>
              {t('suppliers.details.subtitle', {
                defaultValue: 'Detailed contact, commercial specifications, and linked records',
              })}
            </SheetDescription>
          </SheetHeader>

          {/* Quick Contact & Action Bar */}
          <div className='mt-4 flex flex-wrap items-center gap-2 pt-1'>
            {supplier.phone && (
              <Button
                size='sm'
                variant='outline'
                className='h-8 gap-1.5 text-xs bg-background/80 hover:bg-background'
                asChild
              >
                <a href={`tel:${supplier.phone}`}>
                  <Phone className='h-3.5 w-3.5 text-primary' />
                  <span>{supplier.phone}</span>
                </a>
              </Button>
            )}
            {supplier.email && (
              <Button
                size='sm'
                variant='outline'
                className='h-8 gap-1.5 text-xs bg-background/80 hover:bg-background'
                asChild
              >
                <a href={`mailto:${supplier.email}`}>
                  <Mail className='h-3.5 w-3.5 text-primary' />
                  <span className='max-w-[160px] truncate'>{supplier.email}</span>
                </a>
              </Button>
            )}
            {supplier.website && (
              <Button
                size='sm'
                variant='outline'
                className='h-8 gap-1.5 text-xs bg-background/80 hover:bg-background'
                asChild
              >
                <a
                  href={
                    supplier.website.startsWith('http')
                      ? supplier.website
                      : `https://${supplier.website}`
                  }
                  target='_blank'
                  rel='noreferrer'
                >
                  <Globe className='h-3.5 w-3.5 text-primary' />
                  <span>{t('suppliers.columns.website', { defaultValue: 'Website' })}</span>
                  <ExternalLink className='h-3 w-3 ms-1 opacity-60' />
                </a>
              </Button>
            )}
            <div className='ms-auto flex items-center gap-1.5'>
              <Can permission='purchasing.manage'>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8 gap-1.5 text-xs bg-background/80 hover:bg-background'
                  onClick={() => setOpen('edit')}
                >
                  <Edit className='h-3.5 w-3.5' />
                  <span>{t('suppliers.actions.edit', { defaultValue: 'Edit' })}</span>
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive'
                  onClick={() => setOpen('delete')}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  <span>{t('suppliers.actions.delete', { defaultValue: 'Delete' })}</span>
                </Button>
              </Can>
            </div>
          </div>
        </div>

        {/* Scrollable Content with Tabs */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          <Tabs defaultValue='overview' className='w-full'>
            <TabsList className='grid w-full grid-cols-2 mb-4'>
              <TabsTrigger value='overview' className='gap-2 text-xs sm:text-sm'>
                <Building2 className='h-4 w-4' />
                <span>{t('suppliers.details.tabOverview', { defaultValue: 'Overview' })}</span>
              </TabsTrigger>
              <TabsTrigger value='activity' className='gap-2 text-xs sm:text-sm'>
                <Package className='h-4 w-4' />
                <span>
                  {t('suppliers.details.tabActivity', { defaultValue: 'Activity & Catalog' })}
                </span>
                {linkedProducts + linkedOrders > 0 && (
                  <Badge variant='secondary' className='ms-1 px-1.5 py-0 text-[10px]'>
                    {linkedProducts + linkedOrders}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value='overview' className='space-y-6 mt-0'>
              {/* Contact Information Card */}
              <div className='space-y-3'>
                <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                  <User className='h-3.5 w-3.5 text-primary' />
                  <span>{t('suppliers.details.contactInfo', { defaultValue: 'Contact Details' })}</span>
                </h4>
                <div className='rounded-lg border bg-card p-4 space-y-3'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm'>
                    <div className='space-y-1'>
                      <span className='text-xs text-muted-foreground'>
                        {t('suppliers.columns.contactPerson', { defaultValue: 'Contact Person' })}
                      </span>
                      <div className='font-medium text-foreground flex items-center gap-2'>
                        <User className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                        <span>{supplier.contact_person || '-'}</span>
                      </div>
                    </div>

                    <div className='space-y-1'>
                      <span className='text-xs text-muted-foreground'>
                        {t('suppliers.columns.email', { defaultValue: 'Email Address' })}
                      </span>
                      <div className='font-medium text-foreground flex items-center gap-2'>
                        <Mail className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                        {supplier.email ? (
                          <div className='flex items-center gap-1.5 min-w-0'>
                            <a
                              href={`mailto:${supplier.email}`}
                              className='text-primary hover:underline truncate'
                            >
                              {supplier.email}
                            </a>
                            <button
                              type='button'
                              onClick={() => copyToClipboard(supplier.email!, 'Email')}
                              className='text-muted-foreground hover:text-foreground shrink-0'
                            >
                              {copiedField === 'Email' ? (
                                <Check className='h-3 w-3 text-emerald-500' />
                              ) : (
                                <Copy className='h-3 w-3' />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </div>
                    </div>

                    <div className='space-y-1'>
                      <span className='text-xs text-muted-foreground'>
                        {t('suppliers.columns.phone', { defaultValue: 'Phone Number' })}
                      </span>
                      <div className='font-medium text-foreground flex items-center gap-2'>
                        <Phone className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                        {supplier.phone ? (
                          <div className='flex items-center gap-1.5 min-w-0'>
                            <a
                              href={`tel:${supplier.phone}`}
                              className='text-primary hover:underline font-mono text-xs'
                            >
                              {supplier.phone}
                            </a>
                            <button
                              type='button'
                              onClick={() => copyToClipboard(supplier.phone!, 'Phone')}
                              className='text-muted-foreground hover:text-foreground shrink-0'
                            >
                              {copiedField === 'Phone' ? (
                                <Check className='h-3 w-3 text-emerald-500' />
                              ) : (
                                <Copy className='h-3 w-3' />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </div>
                    </div>

                    <div className='space-y-1'>
                      <span className='text-xs text-muted-foreground'>
                        {t('suppliers.columns.website', { defaultValue: 'Website' })}
                      </span>
                      <div className='font-medium text-foreground flex items-center gap-2'>
                        <Globe className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                        {supplier.website ? (
                          <a
                            href={
                              supplier.website.startsWith('http')
                                ? supplier.website
                                : `https://${supplier.website}`
                            }
                            target='_blank'
                            rel='noreferrer'
                            className='text-primary hover:underline truncate max-w-[190px]'
                          >
                            {supplier.website}
                          </a>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {supplier.address && (
                    <>
                      <Separator />
                      <div className='space-y-1 pt-1'>
                        <span className='text-xs text-muted-foreground'>
                          {t('suppliers.columns.address', { defaultValue: 'Physical Address' })}
                        </span>
                        <div className='font-normal text-muted-foreground flex items-start gap-2 text-sm'>
                          <MapPin className='h-4 w-4 text-muted-foreground shrink-0 mt-0.5' />
                          <span className='leading-relaxed'>{supplier.address}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Commercial Terms & Fiscal Profile */}
              <div className='space-y-3'>
                <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                  <CreditCard className='h-3.5 w-3.5 text-primary' />
                  <span>
                    {t('suppliers.details.commercialTerms', { defaultValue: 'Commercial Terms' })}
                  </span>
                </h4>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                    <span className='text-xs text-muted-foreground block'>
                      {t('suppliers.columns.taxNumber', { defaultValue: 'Tax / VAT ID' })}
                    </span>
                    <div className='font-mono text-sm font-semibold flex items-center justify-between'>
                      <span className='truncate'>{supplier.tax_number || '-'}</span>
                      {supplier.tax_number && (
                        <button
                          type='button'
                          onClick={() => copyToClipboard(supplier.tax_number!, 'Tax Number')}
                          className='text-muted-foreground hover:text-foreground shrink-0 ms-1'
                        >
                          {copiedField === 'Tax Number' ? (
                            <Check className='h-3 w-3 text-emerald-500' />
                          ) : (
                            <Copy className='h-3 w-3' />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                    <span className='text-xs text-muted-foreground block'>
                      {t('suppliers.columns.paymentTerms', { defaultValue: 'Payment Terms' })}
                    </span>
                    <div className='font-semibold text-sm text-foreground flex items-center gap-1.5'>
                      <Clock className='h-3.5 w-3.5 text-primary shrink-0' />
                      <span className='truncate'>{formatPaymentTerms(supplier.payment_terms_days)}</span>
                    </div>
                  </div>

                  <div className='rounded-lg border bg-card p-3.5 space-y-1'>
                    <span className='text-xs text-muted-foreground block'>
                      {t('suppliers.details.currency', { defaultValue: 'Operating Currency' })}
                    </span>
                    <div className='font-semibold text-sm text-foreground flex items-center gap-1.5'>
                      <Badge variant='outline' className='text-xs font-mono font-semibold'>
                        LE
                      </Badge>
                      <span className='text-xs text-muted-foreground'>
                        {t('common.localCurrency', { defaultValue: 'Regional / Local' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Procurement Notes */}
              <div className='space-y-3'>
                <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  {t('suppliers.details.notes', { defaultValue: 'Procurement Notes' })}
                </h4>
                <div className='rounded-lg border bg-card p-4 text-sm'>
                  {supplier.notes ? (
                    <p className='whitespace-pre-wrap text-muted-foreground leading-relaxed'>
                      {supplier.notes}
                    </p>
                  ) : (
                    <span className='italic text-muted-foreground text-xs'>
                      {t('suppliers.details.noNotes', {
                        defaultValue: 'No additional notes recorded for this supplier.',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* System Metadata */}
              <div className='rounded-lg border border-dashed bg-muted/20 p-3 space-y-1 text-xs text-muted-foreground'>
                {supplier.created_at && (
                  <div className='flex items-center gap-1.5'>
                    <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                    <span>
                      {t('suppliers.columns.createdAt', { defaultValue: 'Created At' })}:{' '}
                      {new Date(supplier.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className='flex items-center gap-1.5 font-mono text-[11px] pt-0.5'>
                  <span className='text-muted-foreground'>ID: {supplier.id}</span>
                  <button
                    type='button'
                    onClick={() => copyToClipboard(supplier.id, 'Supplier ID')}
                    className='text-muted-foreground hover:text-foreground'
                  >
                    {copiedField === 'Supplier ID' ? (
                      <Check className='h-3 w-3 text-emerald-500' />
                    ) : (
                      <Copy className='h-3 w-3' />
                    )}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: ACTIVITY & LINKED RECORDS */}
            <TabsContent value='activity' className='space-y-5 mt-0'>
              {/* Linked Metric Cards */}
              <div className='grid grid-cols-2 gap-3'>
                <div className='flex items-center gap-3.5 rounded-lg border bg-card p-4'>
                  <div className='h-11 w-11 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0'>
                    <Package className='h-5 w-5 text-blue-500' />
                  </div>
                  <div className='space-y-0.5 min-w-0'>
                    <div className='text-2xl font-bold tracking-tight'>{linkedProducts}</div>
                    <div className='text-xs text-muted-foreground font-medium truncate'>
                      {t('suppliers.columns.productsCount', { defaultValue: 'Catalog Products' })}
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-3.5 rounded-lg border bg-card p-4'>
                  <div className='h-11 w-11 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0'>
                    <Receipt className='h-5 w-5 text-emerald-500' />
                  </div>
                  <div className='space-y-0.5 min-w-0'>
                    <div className='text-2xl font-bold tracking-tight'>{linkedOrders}</div>
                    <div className='text-xs text-muted-foreground font-medium truncate'>
                      {t('suppliers.columns.ordersCount', { defaultValue: 'Purchase Orders' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Catalog Items Information Card */}
              <div className='rounded-lg border bg-card p-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Package className='h-4 w-4 text-primary' />
                    <h5 className='text-sm font-semibold'>
                      {t('suppliers.details.linkedProducts', { defaultValue: 'Catalog Products' })}
                    </h5>
                  </div>
                  <Badge variant='outline'>{linkedProducts}</Badge>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  {t('suppliers.details.catalogDescription', {
                    defaultValue:
                      'Products supplied by this vendor in your inventory catalog. Assigned suppliers are used for stock replenishments.',
                  })}
                </p>
              </div>

              {/* Purchase Orders Information Card */}
              <div className='rounded-lg border bg-card p-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Receipt className='h-4 w-4 text-emerald-500' />
                    <h5 className='text-sm font-semibold'>
                      {t('suppliers.details.linkedOrders', { defaultValue: 'Purchase Orders' })}
                    </h5>
                  </div>
                  <Badge variant='outline'>{linkedOrders}</Badge>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  {t('suppliers.details.ordersDescription', {
                    defaultValue:
                      'Procurement documents and goods receipts processed with this vendor. Active orders prevent accidental supplier deletion.',
                  })}
                </p>
              </div>

              {/* Vendor Procurement Status Banner */}
              <div className='rounded-lg border bg-muted/20 p-4 space-y-3'>
                <div className='flex items-center gap-2'>
                  <ShieldCheck className='h-4 w-4 text-primary' />
                  <span className='text-xs font-semibold uppercase tracking-wider text-foreground'>
                    {t('suppliers.details.authorizationTitle', {
                      defaultValue: 'Procurement Authorization',
                    })}
                  </span>
                </div>
                <div className='space-y-2 text-xs'>
                  <div className='flex items-start gap-2'>
                    {isActive ? (
                      <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
                    ) : (
                      <XCircle className='h-3.5 w-3.5 text-destructive shrink-0 mt-0.5' />
                    )}
                    <span className='text-muted-foreground'>
                      {isActive
                        ? t('suppliers.details.authorizedPurchasing', {
                            defaultValue:
                              'Authorized for active purchase orders, receiving, and price list quotes.',
                          })
                        : t('suppliers.details.inactivePurchasing', {
                            defaultValue:
                              'Vendor is marked inactive. New purchase orders cannot be issued.',
                          })}
                    </span>
                  </div>
                  <div className='flex items-start gap-2'>
                    {isPreferred ? (
                      <Star className='h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0 mt-0.5' />
                    ) : (
                      <Clock className='h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5' />
                    )}
                    <span className='text-muted-foreground'>
                      {isPreferred
                        ? t('suppliers.details.preferredReorderNote', {
                            defaultValue:
                              'Designated as preferred vendor: prioritized during automatic replenishment reordering.',
                          })
                        : t('suppliers.details.standardReorderNote', {
                            defaultValue: 'Standard vendor ranking in procurement.',
                          })}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Fixed Sheet Footer */}
        <SheetFooter className='border-t p-4 flex-row justify-between items-center bg-card/60 backdrop-blur-xs'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setOpen(null)}
          >
            {t('suppliers.details.close', { defaultValue: 'Close' })}
          </Button>

          <div className='flex items-center gap-2'>
            <Can permission='purchasing.manage'>
              <Button
                variant='outline'
                size='sm'
                className='text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5'
                onClick={() => setOpen('delete')}
              >
                <Trash2 className='h-3.5 w-3.5' />
                <span>{t('suppliers.actions.delete', { defaultValue: 'Delete' })}</span>
              </Button>
              <Button
                size='sm'
                className='gap-1.5'
                onClick={() => setOpen('edit')}
              >
                <Edit className='h-3.5 w-3.5' />
                <span>{t('suppliers.details.edit', { defaultValue: 'Edit Supplier' })}</span>
              </Button>
            </Can>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
