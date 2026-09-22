import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInvoiceReports } from '../hooks/use-sales-invoices'
import { InvoiceStatusBadge } from './invoice-status-badge'
import {
  FileText,
  Calendar,
  Printer,
  ArrowLeft,
} from 'lucide-react'

export const InvoiceReportsView: React.FC = () => {
  const { t } = useTranslation()
  const [reportType, setReportType] = useState<'sales' | 'outstanding' | 'tax' | 'discount' | 'pos'>('sales')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const { data, isLoading } = useInvoiceReports({
    reportType,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/sales-invoices">
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('salesInvoices.detail.backToInvoices', 'Invoices')}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {t('salesInvoices.reports.pageTitle', 'Commercial & Financial Reports')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                'salesInvoices.reports.pageDescription',
                'Financial auditing, receivables tracking, tax liability, and discount analysis'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            {t('salesInvoices.reports.printReport', 'Print Report')}
          </Button>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border rounded-xl p-3 shadow-2xs">
        <Tabs
          value={reportType}
          onValueChange={(val: any) => setReportType(val)}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-3 sm:grid-cols-5 h-9">
            <TabsTrigger value="sales" className="text-xs">
              {t('salesInvoices.reports.tabs.sales', 'Sales')}
            </TabsTrigger>
            <TabsTrigger value="outstanding" className="text-xs">
              {t('salesInvoices.reports.tabs.outstanding', 'Outstanding')}
            </TabsTrigger>
            <TabsTrigger value="tax" className="text-xs">
              {t('salesInvoices.reports.tabs.tax', 'Tax / VAT')}
            </TabsTrigger>
            <TabsTrigger value="discount" className="text-xs">
              {t('salesInvoices.reports.tabs.discount', 'Discounts')}
            </TabsTrigger>
            <TabsTrigger value="pos" className="text-xs">
              {t('salesInvoices.reports.tabs.pos', 'POS Channel')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs w-36 pl-7"
              title={t('salesInvoices.filters.fromDate', 'From Date')}
            />
            <Calendar className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <span className="text-xs text-muted-foreground">{t('salesInvoices.filters.to', 'to')}</span>
          <div className="relative">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs w-36 pl-7"
              title={t('salesInvoices.filters.toDate', 'To Date')}
            />
            <Calendar className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Summary KPI Banner */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reportType === 'sales' && (
            <>
              <Card className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <div className="text-xs text-muted-foreground font-semibold">
                  {t('salesInvoices.reports.kpi.totalSalesBilled', 'Total Sales Billed')}
                </div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(data.summary.totalAmount)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {t('salesInvoices.reports.kpi.acrossInvoices', 'Across {{count}} invoices', {
                    count: data.summary.invoiceCount || 0,
                  })}
                </div>
              </Card>
              <Card className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                <div className="text-xs text-muted-foreground font-semibold">
                  {t('salesInvoices.reports.kpi.totalCollected', 'Total Collected')}
                </div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(data.summary.totalPaid)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {t('salesInvoices.reports.kpi.cashCardReceipts', 'Cash & card receipts')}
                </div>
              </Card>
              <Card className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <div className="text-xs text-muted-foreground font-semibold">
                  {t('salesInvoices.reports.kpi.totalDue', 'Total Due')}
                </div>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {formatCurrency(data.summary.totalDue)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {t('salesInvoices.reports.kpi.awaitingSettlement', 'Awaiting settlement')}
                </div>
              </Card>
            </>
          )}

          {reportType === 'outstanding' && (
            <>
              <Card className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <div className="text-xs text-muted-foreground font-semibold">
                  {t('salesInvoices.reports.kpi.totalUnpaidBalance', 'Total Unpaid Balance')}
                </div>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {formatCurrency(data.summary.totalDue)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {t(
                    'salesInvoices.reports.kpi.acrossOverdueInvoices',
                    'Across {{count}} overdue/pending invoices',
                    { count: data.summary.invoiceCount || 0 }
                  )}
                </div>
              </Card>
            </>
          )}

          {reportType === 'tax' && (
            <>
              <Card className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                <div className="text-xs text-muted-foreground font-semibold">
                  {t('salesInvoices.reports.kpi.totalTaxCollected', 'Total Tax Collected')}
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-1">
                  {formatCurrency(data.summary.totalTax)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {t('salesInvoices.reports.kpi.vatLocalTax', 'VAT & local sales tax')}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground font-semibold">
                  {t('salesInvoices.reports.kpi.taxableBaseAmount', 'Taxable Base Amount')}
                </div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(data.summary.taxableAmount)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {t('salesInvoices.reports.kpi.netRevenueBeforeTax', 'Net revenue before tax')}
                </div>
              </Card>
            </>
          )}

          {reportType === 'discount' && (
            <Card className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
              <div className="text-xs text-muted-foreground font-semibold">
                {t('salesInvoices.reports.kpi.totalDiscountsAllowed', 'Total Discounts Allowed')}
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(data.summary.totalDiscount)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {t(
                  'salesInvoices.reports.kpi.couponsPromosDiscounts',
                  'Coupons, promos & manual discounts'
                )}
              </div>
            </Card>
          )}

          {reportType === 'pos' && (
            <Card className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <div className="text-xs text-muted-foreground font-semibold">
                {t('salesInvoices.reports.kpi.totalPosSales', 'Total POS Sales')}
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(data.summary.totalSales)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {t(
                  'salesInvoices.reports.kpi.storeCheckoutReceipts',
                  '{{count}} store checkout receipts',
                  { count: data.summary.count || 0 }
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Report Data Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold capitalize">
            {t('salesInvoices.reports.breakdown', '{{type}} Breakdown', {
              type: t(`salesInvoices.reports.tabs.${reportType}`, reportType),
            })}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('salesInvoices.reports.recordsFound', '{{count}} records found', {
              count: data?.items?.length || 0,
            })}
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-y text-[10px] uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="py-2.5 px-4">{t('salesInvoices.table.invoiceNo', 'Invoice #')}</th>
                <th className="py-2.5 px-4">{t('salesInvoices.table.date', 'Date')}</th>
                <th className="py-2.5 px-4">{t('salesInvoices.table.customer', 'Customer')}</th>
                <th className="py-2.5 px-4">{t('salesInvoices.table.status', 'Status')}</th>
                <th className="py-2.5 px-4 text-right">{t('salesInvoices.table.total', 'Total')}</th>
                <th className="py-2.5 px-4 text-right">{t('salesInvoices.table.paid', 'Paid')}</th>
                <th className="py-2.5 px-4 text-right">{t('salesInvoices.table.due', 'Due')}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t('salesInvoices.reports.generating', 'Generating report data...')}
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-semibold text-primary">
                      <Link
                        to="/sales-invoices/$invoiceId"
                        params={{ invoiceId: item.id }}
                        className="hover:underline"
                      >
                        {item.invoice_no}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(item.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {item.customers
                        ? item.customers.company_name ||
                          [item.customers.first_name, item.customers.last_name].filter(Boolean).join(' ') ||
                          t('salesInvoices.table.retailCustomer', 'Customer')
                        : t('salesInvoices.table.walkInCustomer', 'Walk-in')}
                    </td>
                    <td className="py-3 px-4">
                      <InvoiceStatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      ${Number(item.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      ${Number(item.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-600">
                      ${Number(item.due_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t(
                      'salesInvoices.reports.noTransactions',
                      'No transactions found for this report period.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
