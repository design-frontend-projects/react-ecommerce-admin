import { useTranslation } from 'react-i18next'
import {
  Warehouse,
  MapPin,
  Phone,
  Mail,
  Building,
  Store,
  Globe,
  Layers,
  Boxes,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Pencil,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useWarehousesContext } from './provider'

export function WarehouseDetailSheet() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, openEdit, openLocations, openDelete } =
    useWarehousesContext()
  const [copiedId, setCopiedId] = useState(false)

  const isOpen = open === 'detail' && !!currentRow

  const handleCopyId = () => {
    if (!currentRow) return
    void navigator.clipboard.writeText(currentRow.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  if (!currentRow) return null

  const locationCount = currentRow._count?.warehouse_locations ?? 0
  const stockCount = currentRow._count?.stock_balances ?? 0
  const hasContact = currentRow.phone || currentRow.email
  const hasFacility = currentRow.branches || currentRow.stores

  return (
    <Sheet open={isOpen} onOpenChange={(val) => !val && setOpen(null)}>
      <SheetContent className='flex flex-col sm:max-w-md p-0 overflow-hidden'>
        {/* Top Header Banner */}
        <div className='relative bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 border-b'>
          <SheetHeader className='p-0 space-y-3'>
            <div className='flex items-start justify-between gap-2 pe-6'>
              <div className='flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20'>
                  <Warehouse className='h-6 w-6' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <Badge
                      variant='outline'
                      className='font-mono font-bold tracking-wider text-xs bg-background/80'
                    >
                      {currentRow.code}
                    </Badge>
                    {currentRow.is_default && (
                      <Badge variant='secondary' className='text-[10px] font-semibold'>
                        {t('warehouses.columns.default', 'Default')}
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className='text-lg font-bold mt-1 text-foreground line-clamp-1'>
                    {currentRow.name}
                  </SheetTitle>
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2 pt-1'>
              {currentRow.is_active ? (
                <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'>
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
                  {t('warehouses.columns.active', 'Active')}
                </span>
              ) : (
                <span className='inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive border border-destructive/20'>
                  <span className='h-1.5 w-1.5 rounded-full bg-destructive' />
                  {t('warehouses.columns.inactive', 'Inactive')}
                </span>
              )}

              {currentRow.allow_negative_stock ? (
                <Badge
                  variant='outline'
                  className='border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[11px]'
                >
                  <ShieldAlert className='me-1 h-3 w-3' />
                  {t('warehouses.columns.allowNegative', 'Allow Negative')}
                </Badge>
              ) : (
                <Badge
                  variant='outline'
                  className='text-[11px] text-muted-foreground border-border'
                >
                  <ShieldCheck className='me-1 h-3 w-3 text-emerald-500' />
                  {t('warehouses.columns.strictStock', 'Strict Stock')}
                </Badge>
              )}
            </div>

            <SheetDescription className='sr-only'>
              Warehouse details for {currentRow.name}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {/* Quick Metrics Bar */}
          <div className='grid grid-cols-2 gap-3'>
            <button
              type='button'
              onClick={() => {
                setOpen(null)
                openLocations(currentRow)
              }}
              className='flex flex-col items-start p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors text-start group cursor-pointer'
            >
              <div className='flex items-center justify-between w-full'>
                <span className='text-xs text-muted-foreground font-medium'>
                  {t('warehouses.kpis.locations', 'Storage Locations')}
                </span>
                <Layers className='h-4 w-4 text-violet-500 group-hover:scale-110 transition-transform' />
              </div>
              <span className='text-xl font-bold tracking-tight mt-1 text-foreground'>
                {locationCount}
              </span>
              <span className='text-[10px] text-primary mt-0.5 font-medium group-hover:underline'>
                {t('warehouses.manageLocations', 'Manage locations')} →
              </span>
            </button>

            <div className='flex flex-col items-start p-3 rounded-lg border bg-card'>
              <div className='flex items-center justify-between w-full'>
                <span className='text-xs text-muted-foreground font-medium'>
                  {t('warehouses.columns.stockCount', 'Stock Items')}
                </span>
                <Boxes className='h-4 w-4 text-blue-500' />
              </div>
              <span className='text-xl font-bold tracking-tight mt-1 text-foreground'>
                {stockCount}
              </span>
              <span className='text-[10px] text-muted-foreground mt-0.5'>
                {t('warehouses.detail.trackedBalances', 'Tracked balances')}
              </span>
            </div>
          </div>

          {/* Facility Links Section */}
          <div className='space-y-2.5'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              {t('warehouses.detail.facilitySection', 'Connected Facility')}
            </h4>
            <div className='rounded-lg border bg-card p-3 space-y-2'>
              {hasFacility ? (
                <>
                  {currentRow.branches?.name && (
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                        <Building className='h-3.5 w-3.5 text-blue-500 shrink-0' />
                        {t('warehouses.columns.branch', 'Branch')}
                      </span>
                      <span className='font-medium text-foreground'>
                        {currentRow.branches.name}
                      </span>
                    </div>
                  )}
                  {currentRow.branches?.name && (
                    (currentRow.store_warehouses && currentRow.store_warehouses.length > 0) ||
                    currentRow.stores?.name
                  ) && <Separator />}
                  {currentRow.store_warehouses && currentRow.store_warehouses.length > 0 ? (
                    <div className='space-y-2 pt-1'>
                      <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                        <Store className='h-3.5 w-3.5 text-amber-500 shrink-0' />
                        {t('warehouses.detail.servicedStores', 'Serviced Stores')} ({currentRow.store_warehouses.length})
                      </span>
                      <div className='space-y-1.5'>
                        {currentRow.store_warehouses.map((sw) => (
                          <div
                            key={sw.id}
                            className='flex items-center justify-between rounded-md bg-muted/40 p-2 text-xs'
                          >
                            <div className='flex items-center gap-1.5'>
                              <span className='font-medium text-foreground'>
                                {sw.stores?.name || t('stores.unnamed', 'Unnamed Store')}
                              </span>
                              {sw.is_default && (
                                <Badge variant='secondary' className='text-[9px] px-1.5 py-0'>
                                  ★ {t('stores.warehouses.default', 'Default')}
                                </Badge>
                              )}
                            </div>
                            <div className='flex items-center gap-2 text-muted-foreground font-mono'>
                              <span>#{sw.priority}</span>
                              {sw.lead_time_days ? (
                                <span className='text-[10px] bg-background px-1.5 py-0.5 rounded border'>
                                  {sw.lead_time_days}d
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : currentRow.stores?.name ? (
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                        <Store className='h-3.5 w-3.5 text-amber-500 shrink-0' />
                        {t('warehouses.columns.store', 'Store')}
                      </span>
                      <span className='font-medium text-foreground'>
                        {currentRow.stores.name}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className='text-xs text-muted-foreground italic'>
                  {t('warehouses.detail.noFacilityLinked', 'No branch or store linked.')}
                </p>
              )}
            </div>
          </div>

          {/* Geographic Location Section */}
          <div className='space-y-2.5'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              {t('warehouses.detail.locationSection', 'Geographic Location')}
            </h4>
            <div className='rounded-lg border bg-card p-3 space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                  <Globe className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                  {t('warehouses.columns.country', 'Country')}
                </span>
                <span className='font-medium text-foreground'>
                  {currentRow.countries?.name ?? '—'}
                  {currentRow.countries?.code && ` (${currentRow.countries.code})`}
                </span>
              </div>
              <Separator />
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                  <MapPin className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                  {t('warehouses.columns.city', 'City')}
                </span>
                <span className='font-medium text-foreground'>
                  {currentRow.cities?.name ?? '—'}
                </span>
              </div>
              {currentRow.address && (
                <>
                  <Separator />
                  <div className='pt-1'>
                    <span className='text-xs text-muted-foreground block mb-1'>
                      {t('warehouses.form.address', 'Street Address')}
                    </span>
                    <p className='text-sm text-foreground bg-muted/40 p-2 rounded-md font-sans'>
                      {currentRow.address}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact Details Section */}
          {hasContact && (
            <div className='space-y-2.5'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                {t('warehouses.detail.contactSection', 'Contact Details')}
              </h4>
              <div className='rounded-lg border bg-card p-3 space-y-2'>
                {currentRow.phone && (
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                      <Phone className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                      {t('warehouses.form.phone', 'Phone')}
                    </span>
                    <a
                      href={`tel:${currentRow.phone}`}
                      className='font-medium text-primary hover:underline'
                    >
                      {currentRow.phone}
                    </a>
                  </div>
                )}
                {currentRow.phone && currentRow.email && <Separator />}
                {currentRow.email && (
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                      <Mail className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                      {t('warehouses.form.email', 'Email')}
                    </span>
                    <a
                      href={`mailto:${currentRow.email}`}
                      className='font-medium text-primary hover:underline text-xs'
                    >
                      {currentRow.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {currentRow.notes && (
            <div className='space-y-2.5'>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                {t('warehouses.form.notes', 'Internal Notes')}
              </h4>
              <div className='rounded-lg border bg-card p-3'>
                <p className='text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed'>
                  {currentRow.notes}
                </p>
              </div>
            </div>
          )}

          {/* System Info */}
          <div className='space-y-2 pt-2 border-t text-[11px] text-muted-foreground'>
            <div className='flex items-center justify-between'>
              <span className='flex items-center gap-1'>
                <Calendar className='h-3 w-3' />
                {t('warehouses.columns.createdAt', 'Created')}
              </span>
              <span>
                {currentRow.created_at
                  ? new Date(currentRow.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span>ID</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      onClick={handleCopyId}
                      className='inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground'
                    >
                      {currentRow.id.slice(0, 8)}...
                      {copiedId ? (
                        <Check className='h-3 w-3 text-emerald-500' />
                      ) : (
                        <Copy className='h-3 w-3' />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copiedId ? 'Copied!' : 'Click to copy ID'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className='p-4 border-t bg-muted/20 flex items-center justify-between gap-2 mt-auto'>
          <Button
            variant='destructive'
            size='sm'
            onClick={() => {
              setOpen(null)
              openDelete(currentRow)
            }}
          >
            <Trash2 className='me-1.5 h-3.5 w-3.5' />
            {t('common.delete', 'Delete')}
          </Button>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setOpen(null)
                openLocations(currentRow)
              }}
            >
              <Layers className='me-1.5 h-3.5 w-3.5 text-violet-500' />
              {t('warehouses.manageLocations', 'Locations')}
            </Button>
            <Button
              size='sm'
              onClick={() => {
                setOpen(null)
                openEdit(currentRow)
              }}
            >
              <Pencil className='me-1.5 h-3.5 w-3.5' />
              {t('common.edit', 'Edit')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
