import {
  DollarSign,
  Boxes,
  ShieldCheck,
  ShoppingCart,
  CalendarClock,
  ArrowUpDown,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardKPIs, DashboardCurrency } from '../types'
import { KpiCard } from './kpi-card'

interface KpiGridProps {
  kpis: DashboardKPIs
  currency: DashboardCurrency
  onCardClick?: (kpiKey: string) => void
}

export function KpiGrid({ kpis, currency, onCardClick }: KpiGridProps) {
  const { t } = useTranslation()

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
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
      {/* 1. Total Inventory Value */}
      <KpiCard
        title={t('dashboard.kpis.inventoryValue', 'Inventory Value')}
        value={formatMoney(kpis.totalInventoryValue)}
        subValue={t(
          'dashboard.kpis.stockedSkus',
          'Across {{skuCount}} stocked SKUs',
          {
            skuCount: kpis.activeSkus.toLocaleString(),
          }
        )}
        change={kpis.inventoryValueChange}
        changeLabel={t('dashboard.kpis.estTrend', 'est. trend')}
        icon={<DollarSign className='h-4 w-4' />}
        accentColor='blue'
        onClick={() => onCardClick?.('inventory_value')}
      />

      {/* 2. Active SKUs */}
      <KpiCard
        title={t('dashboard.kpis.activeSkus', 'Active SKUs')}
        value={kpis.activeSkus.toLocaleString()}
        subValue={t(
          'dashboard.kpis.ofCatalog',
          'of {{total}} in catalog ({{percent}}%)',
          {
            total: kpis.totalSkus.toLocaleString(),
            percent: skuPercent,
          }
        )}
        progressValue={skuPercent}
        icon={<Boxes className='h-4 w-4' />}
        accentColor='violet'
        onClick={() => onCardClick?.('active_skus')}
      />

      {/* 3. Stock Health Score */}
      <KpiCard
        title={t('dashboard.kpis.stockHealth', 'Stock Health')}
        value={`${kpis.stockHealthScore}%`}
        subValue={
          kpis.stockHealthScore >= 85
            ? t('dashboard.kpis.optimalLevel', 'Optimal stocking level')
            : kpis.stockHealthScore >= 70
              ? t('dashboard.kpis.reviewWarnings', 'Review low stock warnings')
              : t('dashboard.kpis.criticalBreaches', 'Critical stock breaches')
        }
        progressValue={kpis.stockHealthScore}
        change={kpis.stockHealthChange}
        changeLabel={t('dashboard.kpis.benchmark', 'benchmark')}
        icon={<ShieldCheck className='h-4 w-4' />}
        accentColor='emerald'
        onClick={() => onCardClick?.('stock_health')}
      />

      {/* 4. Sales Today */}
      <KpiCard
        title={t('dashboard.kpis.salesToday', 'Sales Today')}
        value={formatMoney(kpis.salesToday)}
        subValue={t('dashboard.kpis.todaysInvoices', "Today's posted invoices")}
        change={kpis.salesTodayChange}
        changeLabel={t('dashboard.kpis.vsYesterday', 'vs yesterday')}
        icon={<ArrowUpDown className='h-4 w-4' />}
        accentColor='amber'
        onClick={() => onCardClick?.('sales_today')}
      />

      {/* 5. Pending PO Value */}
      <KpiCard
        title={t('dashboard.kpis.pendingPOs', 'Pending POs')}
        value={formatMoney(kpis.pendingPoValue)}
        subValue={t(
          'dashboard.kpis.ordersIncoming',
          '{{count}} orders incoming / awaiting receipt',
          {
            count: kpis.pendingPoCount,
          }
        )}
        icon={<ShoppingCart className='h-4 w-4' />}
        accentColor='cyan'
        onClick={() => onCardClick?.('pending_pos')}
      />

      {/* 6. Batch Expiry Status */}
      <KpiCard
        title={t('dashboard.kpis.expiryAlerts', 'Expiry Alerts')}
        value={`${kpis.expiringBatchesCount + kpis.expiredBatchesCount}`}
        subValue={t(
          'dashboard.kpis.expiredAndExpiring',
          '{{expired}} expired, {{expiring}} <30 days',
          {
            expired: kpis.expiredBatchesCount,
            expiring: kpis.expiringBatchesCount,
          }
        )}
        icon={<CalendarClock className='h-4 w-4' />}
        accentColor='rose'
        onClick={() => onCardClick?.('expiry_alerts')}
      />
    </div>
  )
}
