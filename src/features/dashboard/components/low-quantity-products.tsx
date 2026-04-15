import { Link } from '@tanstack/react-router'
import { AlertCircle, PackageSearch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import type { LowQuantityProduct } from '../use-dashboard-data'

interface Props {
  data: LowQuantityProduct[]
  isLoading?: boolean
}

export function LowQuantityProducts({ data, isLoading }: Props) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Skeleton className="h-4 w-32" /></CardTitle>
          <CardDescription><Skeleton className="h-3 w-48" /></CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='flex items-center justify-between'>
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-3 w-16' />
                </div>
                <Skeleton className='h-6 w-12' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              {t('dashboard.lowStockAlerts')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.lowStockDescription')}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/products">{t('dashboard.manage')}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <PackageSearch className="w-8 h-8 mb-4 opacity-50" />
            <p>{t('dashboard.allStockAdequate')}</p>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {data.map((product) => (
              <div
                key={product.id}
                className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors'
              >
                <div className='flex items-start gap-4'>
                  <div className='flex flex-col gap-1'>
                    <span className='font-medium line-clamp-1'>
                      {product.product_name}
                    </span>
                    <span className='text-xs text-muted-foreground font-mono'>
                      {t('dashboard.sku')}: {product.sku}
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="destructive" className="font-mono text-xs">
                      {product.stock_quantity.toLocaleString()} {t('dashboard.left')}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {t('dashboard.min')}: {product.min_stock.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
