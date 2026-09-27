'use client'

import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { type Product } from '../data/schema'
import { Star, Truck } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Product | null
}

export function ProductViewDialog({ open, onOpenChange, currentRow }: Props) {
  const { t } = useTranslation()
  if (!currentRow) return null

  const categoryName = currentRow.categories
    ? currentRow.categories.name_ar
      ? `${currentRow.categories.name} (${currentRow.categories.name_ar})`
      : currentRow.categories.name
    : 'N/A'
  const brandName = currentRow.brands
    ? currentRow.brands.name_ar
      ? `${currentRow.brands.name} (${currentRow.brands.name_ar})`
      : currentRow.brands.name
    : 'N/A'
  const uomName = currentRow.base_uom ? `${currentRow.base_uom.name} (${currentRow.base_uom.code})` : 'N/A'
  const supplierName = currentRow.suppliers?.name || 'N/A'

  const variants = currentRow.product_variants || []
  const hasVariants = variants.length > 0
  const suppliers = currentRow.product_suppliers || []
  const hasSuppliers = suppliers.length > 0

  const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(price))
  }

  const pTypeKey = currentRow.product_type ? `products.enums.productType.${currentRow.product_type}` : null
  const trackingModeKey = currentRow.tracking_mode ? `products.enums.trackingMode.${currentRow.tracking_mode}` : 'products.enums.trackingMode.none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] max-w-3xl flex-col overflow-hidden'>
        <DialogHeader>
          <div className='mt-2 flex items-start justify-between gap-4'>
            <div>
              <div className='flex items-center gap-2'>
                <DialogTitle className='text-2xl font-bold'>
                  {currentRow.name}
                </DialogTitle>
                {currentRow.product_code && (
                  <Badge variant='outline' className='font-mono text-xs border-primary/40 text-primary'>
                    {currentRow.product_code}
                  </Badge>
                )}
              </div>
              {currentRow.name_ar && (
                <p className='text-sm text-muted-foreground mt-0.5' dir='rtl'>
                  {currentRow.name_ar}
                </p>
              )}
              {currentRow.short_description && (
                <p className='text-xs text-muted-foreground mt-1'>
                  {currentRow.short_description}
                </p>
              )}
            </div>
            <div className='flex flex-wrap items-center gap-2 shrink-0'>
              <Badge variant={currentRow.is_active ? 'default' : 'secondary'}>
                {currentRow.is_active ? t('products.form.active') : t('products.form.inactive')}
              </Badge>
              {currentRow.product_type && (
                <Badge variant='outline' className='capitalize'>
                  {pTypeKey ? t(pTypeKey, currentRow.product_type) : currentRow.product_type}
                </Badge>
              )}
              {currentRow.product_types && (
                <Badge
                  variant='outline'
                  className='gap-1.5 font-normal'
                  style={{
                    borderColor: currentRow.product_types.color || undefined,
                  }}
                >
                  {currentRow.product_types.color && (
                    <span
                      className='h-2 w-2 rounded-full shrink-0'
                      style={{ backgroundColor: currentRow.product_types.color }}
                    />
                  )}
                  <span>{currentRow.product_types.name}</span>
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className='-mr-4 flex-1 pr-4'>
          <div className='space-y-5 pb-6'>
            {/* General Info */}
            <div className='space-y-3'>
              <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                {t('products.form.basicInfo')}
              </h4>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.columns.sku')}</Label>
                  <p className='font-mono text-sm font-medium'>{currentRow.sku || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.columns.barcode')}</Label>
                  <p className='text-sm font-medium'>{currentRow.barcode || 'N/A'}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.columns.category')}</Label>
                  <p className='text-sm font-medium'>{categoryName}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.columns.brand')}</Label>
                  <p className='text-sm font-medium'>{brandName}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.form.unit')}</Label>
                  <p className='text-sm font-medium'>{uomName}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.columns.supplier')}</Label>
                  <p className='text-sm font-medium'>{supplierName}</p>
                </div>
              </div>

              {currentRow.description && (
                <div className='space-y-1 pt-2'>
                  <Label className='text-xs text-muted-foreground'>{t('products.form.description')}</Label>
                  <p className='text-sm leading-relaxed text-foreground/80'>{currentRow.description}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Inventory & Tracking Details */}
            <div className='space-y-3'>
              <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                {t('products.form.inventoryTracking')}
              </h4>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.columns.trackingMode')}</Label>
                  <p className='text-sm font-medium capitalize'>
                    {t(trackingModeKey, currentRow.tracking_mode || 'None')}
                  </p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.form.isStockItem')}</Label>
                  <p className='text-sm font-medium'>{currentRow.is_stock_item ? 'Yes' : 'No'}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.form.isBatchTracked')}</Label>
                  <p className='text-sm font-medium'>{currentRow.is_batch_tracked ? 'Yes' : 'No'}</p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.form.isSerialTracked')}</Label>
                  <p className='text-sm font-medium'>{currentRow.is_serial_tracked ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Logistics */}
            <div className='space-y-3'>
              <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                {t('products.form.logistics')}
              </h4>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.form.weight')}</Label>
                  <p className='text-sm font-medium'>
                    {currentRow.weight ? `${Number(currentRow.weight)} kg` : 'N/A'}
                  </p>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>{t('products.form.dimensions')}</Label>
                  <p className='text-sm font-medium'>{currentRow.dimensions || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Multi-Supplier Details */}
            {hasSuppliers && (
              <>
                <Separator />
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Truck className='h-4 w-4 text-muted-foreground' />
                    <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                      Suppliers ({suppliers.length})
                    </h4>
                  </div>
                  <div className='overflow-hidden rounded-md border'>
                    <table className='w-full text-left text-sm'>
                      <thead className='border-b bg-muted/50'>
                        <tr>
                          <th className='px-4 py-2 font-medium'>Supplier</th>
                          <th className='px-4 py-2 font-medium'>Supplier Code</th>
                          <th className='px-4 py-2 font-medium'>Unit Cost</th>
                          <th className='px-4 py-2 font-medium'>Lead Time</th>
                          <th className='px-4 py-2 font-medium'>Min Order Qty</th>
                          <th className='px-4 py-2 text-right font-medium'>Status</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y'>
                        {suppliers.map((s, idx) => (
                          <tr key={s.id || idx} className='bg-background'>
                            <td className='px-4 py-3 font-medium flex items-center gap-1.5'>
                              {s.supplier?.name || 'Unknown'}
                              {s.is_preferred && (
                                <Badge variant='default' className='text-[10px] px-1 py-0 h-4 bg-amber-500 hover:bg-amber-600 gap-0.5'>
                                  <Star className='h-2.5 w-2.5 fill-current' /> Preferred
                                </Badge>
                              )}
                            </td>
                            <td className='px-4 py-3 text-xs font-mono text-muted-foreground'>
                              {s.supplier_product_code || s.supplier?.code || '—'}
                            </td>
                            <td className='px-4 py-3'>
                              {s.unit_cost != null ? formatPrice(s.unit_cost) : '—'}
                            </td>
                            <td className='px-4 py-3 text-xs text-muted-foreground'>
                              {s.lead_time_days ? `${s.lead_time_days} days` : '0 days'}
                            </td>
                            <td className='px-4 py-3 text-xs text-muted-foreground'>
                              {s.minimum_order_qty != null ? Number(s.minimum_order_qty) : '0'}
                            </td>
                            <td className='px-4 py-3 text-right'>
                              <Badge variant={s.is_active ? 'outline' : 'secondary'} className='text-[11px]'>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Variants table if exists */}
            {hasVariants && (
              <>
                <Separator />
                <div className='space-y-3'>
                  <h4 className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                    {t('products.form.variants')} ({variants.length})
                  </h4>
                  <div className='overflow-hidden rounded-md border'>
                    <table className='w-full text-left text-sm'>
                      <thead className='border-b bg-muted/50'>
                        <tr>
                          <th className='px-4 py-2 font-medium'>{t('products.form.variantSku')}</th>
                          <th className='px-4 py-2 font-medium'>Attributes</th>
                          <th className='px-4 py-2 font-medium'>{t('products.form.variantPrice')}</th>
                          <th className='px-4 py-2 font-medium'>{t('products.form.variantCost')}</th>
                          <th className='px-4 py-2 font-medium'>{t('products.form.taxRate', 'Tax Rate')}</th>
                          <th className='px-4 py-2 font-medium'>{t('products.form.expirationDate', 'Expiry Date')}</th>
                          <th className='px-4 py-2 text-right font-medium'>{t('products.columns.stock')}</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y'>
                        {variants.map((v, index) => {
                          const pli = (v as { price_list_items?: Array<{ price: number | string; cost_price?: number | string | null }> }).price_list_items
                          const itemPrice = (pli && pli.length > 0) ? pli[0].price : null
                          const costPrice = (pli && pli.length > 0 && pli[0].cost_price != null) ? pli[0].cost_price : null
                          const balances = (v as { stock_balances?: Array<{ qty_available?: number | string; qty_on_hand?: number | string; qty_reserved?: number | string }> }).stock_balances || []
                          const availableStock = balances.reduce((sum, b) => sum + Number(b.qty_available ?? (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))), 0)
                          const pva = v.product_variant_attributes || []

                          return (
                            <tr key={v.id || index} className='bg-background'>
                              <td className='px-4 py-3 font-medium'>
                                {v.sku}
                                {v.name ? ` (${v.name})` : ''}
                              </td>
                              <td className='px-4 py-3'>
                                {pva.length > 0 ? (
                                  <div className='flex flex-wrap gap-1'>
                                    {pva.map((a, aIdx: number) => (
                                      <Badge key={aIdx} variant='outline' className='text-[10px] px-1 py-0'>
                                        {a.attribute_definition?.name}: {a.attribute_value?.value}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className='text-xs text-muted-foreground'>—</span>
                                )}
                              </td>
                              <td className='px-4 py-3'>{itemPrice ? formatPrice(itemPrice) : '-'}</td>
                              <td className='px-4 py-3 text-muted-foreground'>
                                {costPrice ? formatPrice(costPrice) : '-'}
                              </td>
                              <td className='px-4 py-3 text-xs'>
                                {v.tax_rates ? (
                                  <Badge variant='outline' className='text-[10px] font-mono'>
                                    {v.tax_rates.tax_type} ({v.tax_rates.rate}%)
                                  </Badge>
                                ) : (
                                  <span className='text-muted-foreground'>—</span>
                                )}
                              </td>
                              <td className='px-4 py-3 text-xs text-muted-foreground'>
                                {v.expiration_date ? String(v.expiration_date).slice(0, 10) : '—'}
                              </td>
                              <td className='px-4 py-3 text-right'>
                                <Badge
                                  variant={
                                    availableStock <= 0
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                >
                                  {availableStock}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
