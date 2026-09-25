import React from 'react'
import { type Table } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Tag,
  Package,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { type Product } from '../data/schema'
import { computeTotalStock, getStockStatus } from './products-columns'
import { ProductRowActions } from './product-row-actions'

interface ProductsCardsGridProps {
  table: Table<Product>
  isLoading?: boolean
}

export function ProductsCardsGrid({
  table,
  isLoading,
}: ProductsCardsGridProps) {
  const { t } = useTranslation()
  const rows = table.getRowModel().rows

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5'>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className='rounded-xl border bg-card p-4 space-y-3 shadow-xs animate-pulse'
          >
            <div className='flex items-center justify-between'>
              <div className='h-4 bg-muted rounded w-20' />
              <div className='h-5 bg-muted rounded w-16' />
            </div>
            <div className='h-5 bg-muted rounded w-3/4' />
            <div className='h-3 bg-muted rounded w-1/2' />
            <div className='pt-2 flex gap-1.5'>
              <div className='h-5 bg-muted rounded w-14' />
              <div className='h-5 bg-muted rounded w-14' />
            </div>
            <div className='border-t pt-3 flex justify-between items-center'>
              <div className='h-4 bg-muted rounded w-20' />
              <div className='h-8 w-8 bg-muted rounded-full' />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5'>
      {rows.map((row, idx) => {
        const product = row.original
        const totalStock = computeTotalStock(product)
        const stockStatus = getStockStatus(product)
        const isSelected = row.getIsSelected()

        return (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.3) }}
          >
            <Card
              className={`flex flex-col justify-between h-full border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-sm ${
                isSelected
                  ? 'ring-2 ring-primary border-primary bg-primary/[0.02]'
                  : 'hover:border-primary/40'
              }`}
            >
              <CardHeader className='p-3.5 pb-2 space-y-2'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(val) => row.toggleSelected(!!val)}
                      aria-label='Select product'
                      className='translate-y-[1px]'
                    />
                    <span className='font-mono text-xs font-semibold text-muted-foreground'>
                      {product.sku}
                    </span>
                  </div>

                  <div className='flex items-center gap-1.5'>
                    <Badge
                      variant={product.is_active ? 'default' : 'secondary'}
                      className={`text-[10px] px-1.5 py-0 h-4.5 ${
                        product.is_active
                          ? 'bg-emerald-600 dark:bg-emerald-700 text-white'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {product.is_active
                        ? t('common.active', { defaultValue: 'Active' })
                        : t('common.inactive', { defaultValue: 'Inactive' })}
                    </Badge>
                    <ProductRowActions row={row} />
                  </div>
                </div>

                <div>
                  <h3
                    className='font-semibold text-sm leading-snug line-clamp-2 text-foreground'
                    title={product.name}
                  >
                    {product.name}
                  </h3>
                  {product.barcode && (
                    <span className='text-[11px] text-muted-foreground font-mono block mt-0.5'>
                      {product.barcode}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className='p-3.5 pt-0 space-y-2.5 flex-1'>
                {/* Category & Brand tags */}
                <div className='flex flex-wrap gap-1.5 items-center'>
                  {product.categories?.name && (
                    <Badge
                      variant='outline'
                      className='text-[10px] font-normal gap-1 px-1.5 py-0.5 max-w-[130px] truncate'
                      title={product.categories.name}
                    >
                      <Tag className='h-2.5 w-2.5 shrink-0 text-muted-foreground' />
                      <span className='truncate'>{product.categories.name}</span>
                    </Badge>
                  )}

                  {product.brands?.name && (
                    <Badge
                      variant='secondary'
                      className='text-[10px] font-normal gap-1 px-1.5 py-0.5 max-w-[120px] truncate'
                      title={product.brands.name}
                    >
                      <Package className='h-2.5 w-2.5 shrink-0 text-muted-foreground' />
                      <span className='truncate'>{product.brands.name}</span>
                    </Badge>
                  )}

                  {product.base_uom && (
                    <Badge
                      variant='outline'
                      className='text-[10px] font-mono px-1.5 py-0.5'
                    >
                      {product.base_uom.code || product.base_uom.name}
                    </Badge>
                  )}
                </div>

                {/* Supplier info */}
                {product.suppliers?.name && (
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <Building2 className='h-3 w-3 shrink-0 text-muted-foreground/70' />
                    <span className='truncate max-w-[180px]'>
                      {product.suppliers.name}
                    </span>
                  </div>
                )}
              </CardContent>

              <CardFooter className='p-3.5 pt-2 border-t bg-muted/20 flex items-center justify-between text-xs'>
                <div className='flex items-center gap-1.5'>
                  {stockStatus === 'out_of_stock' ? (
                    <Badge
                      variant='outline'
                      className='text-[11px] gap-1 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium'
                    >
                      <XCircle className='h-3 w-3' />
                      {t('products.stockStatus.outOfStock', {
                        defaultValue: 'Out of stock',
                      })}
                    </Badge>
                  ) : stockStatus === 'low_stock' ? (
                    <Badge
                      variant='outline'
                      className='text-[11px] gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium'
                    >
                      <AlertTriangle className='h-3 w-3' />
                      {totalStock}{' '}
                      {t('products.stockStatus.lowStockSuffix', {
                        defaultValue: 'left',
                      })}
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='text-[11px] gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                    >
                      <CheckCircle2 className='h-3 w-3' />
                      {totalStock}{' '}
                      {t('products.stockStatus.inStockSuffix', {
                        defaultValue: 'in stock',
                      })}
                    </Badge>
                  )}
                </div>

                {product.product_type && (
                  <span className='text-[10px] text-muted-foreground capitalize font-medium'>
                    {product.product_type}
                  </span>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
