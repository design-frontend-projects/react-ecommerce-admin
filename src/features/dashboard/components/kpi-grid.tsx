import { DollarSign, Boxes, ShieldCheck, ShoppingCart, CalendarAlert, ArrowUpDown } from 'lucide-react'
import { KpiCard } from './kpi-card'
import type { DashboardKPIs, DashboardCurrency } from '../types'

interface KpiGridProps {
  kpis: DashboardKPIs
  currency: DashboardCurrency
  onCardClick?: (kpiKey: string) => void
}

export function KpiGrid({ kpis, currency, onCardClick }: KpiGridProps) {
  const formatMoney = (val: number) => {
    return `${currency.symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const skuPercent =
    kpis.totalSkus > 0
      ? Math.round((kpis.activeSkus / kpis.totalSkus) * 100)
      : 100

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4'>
      {/* 1. Total Inventory Value */}
      <KpiCard
        title='Inventory Value'
        value={formatMoney(kpis.totalInventoryValue)}
        subValue={`Across ${kpis.activeSkus.toLocaleString()} stocked SKUs`}
        change={kpis.inventoryValueChange}
        changeLabel='est. trend'
        icon={<DollarSign className='w-4 h-4' />}
        accentColor='blue'
        onClick={() => onCardClick?.('inventory_value')}
      />

      {/* 2. Active SKUs */}
      <KpiCard
        title='Active SKUs'
        value={kpis.activeSkus.toLocaleString()}
        subValue={`of ${kpis.totalSkus.toLocaleString()} in catalog (${skuPercent}%)`}
        progressValue={skuPercent}
        icon={<Boxes className='w-4 h-4' />}
        accentColor='violet'
        onClick={() => onCardClick?.('active_skus')}
      />

      {/* 3. Stock Health Score */}
      <KpiCard
        title='Stock Health'
        value={`${kpis.stockHealthScore}%`}
        subValue={
          kpis.stockHealthScore >= 85
            ? 'Optimal stocking level'
            : kpis.stockHealthScore >= 70
            ? 'Review low stock warnings'
            : 'Critical stock breaches'
        }
        progressValue={kpis.stockHealthScore}
        change={kpis.stockHealthChange}
        changeLabel='benchmark'
        icon={<ShieldCheck className='w-4 h-4' />}
        accentColor='emerald'
        onClick={() => onCardClick?.('stock_health')}
      />

      {/* 4. Sales Today */}
      <KpiCard
        title='Sales Today'
        value={formatMoney(kpis.salesToday)}
        subValue="Today's posted invoices"
        change={kpis.salesTodayChange}
        changeLabel='vs yesterday'
        icon={<ArrowUpDown className='w-4 h-4' />}
        accentColor='amber'
        onClick={() => onCardClick?.('sales_today')}
      />

      {/* 5. Pending PO Value */}
      <KpiCard
        title='Pending POs'
        value={formatMoney(kpis.pendingPoValue)}
        subValue={`${kpis.pendingPoCount} orders incoming / awaiting receipt`}
        icon={<ShoppingCart className='w-4 h-4' />}
        accentColor='cyan'
        onClick={() => onCardClick?.('pending_pos')}
      />

      {/* 6. Batch Expiry Status */}
      <KpiCard
        title='Expiry Alerts'
        value={`${kpis.expiringBatchesCount + kpis.expiredBatchesCount}`}
        subValue={`${kpis.expiredBatchesCount} expired, ${kpis.expiringBatchesCount} <30 days`}
        icon={<CalendarAlert className='w-4 h-4' />}
        accentColor='rose'
        onClick={() => onCardClick?.('expiry_alerts')}
      />
    </div>
  )
}
