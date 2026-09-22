import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import enTranslation from '@/assets/i18n/en.json'
import arTranslation from '@/assets/i18n/ar.json'
import { InvoiceStatusBadge, PaymentStatusBadge, InvoiceTypeBadge } from '@/features/sales-invoices/components/invoice-status-badge'
import { InvoiceDashboardCards } from '@/features/sales-invoices/components/invoice-dashboard-cards'

// Mock react-i18next with support for language toggle testing
let currentLang = 'en'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: any) => {
      const dict = currentLang === 'ar' ? (arTranslation as any) : (enTranslation as any)
      const parts = key.split('.')
      let val = dict
      for (const p of parts) {
        if (val && typeof val === 'object' && p in val) {
          val = val[p]
        } else {
          val = undefined
          break
        }
      }

      if (typeof val === 'string') {
        let result = val
        if (options) {
          for (const [k, v] of Object.entries(options)) {
            result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
          }
        }
        return result
      }

      let res = fallback || key
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          res = res.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
        }
      }
      return res
    },
    i18n: {
      language: currentLang,
      changeLanguage: (lang: string) => {
        currentLang = lang
      },
    },
  }),
}))

describe('Sales Invoices Localization Dictionary Integrity', () => {
  it('should have salesInvoices defined in both en.json and ar.json', () => {
    expect((enTranslation as any).salesInvoices).toBeDefined()
    expect((arTranslation as any).salesInvoices).toBeDefined()
  })

  it('should have matching top-level keys under salesInvoices', () => {
    const enKeys = Object.keys((enTranslation as any).salesInvoices).sort()
    const arKeys = Object.keys((arTranslation as any).salesInvoices).sort()
    expect(enKeys).toEqual(arKeys)
  })

  it('should have sidebar navigation translations in en.json and ar.json', () => {
    expect((enTranslation as any).sidebar.salesInvoices).toBe('Sales Invoices')
    expect((enTranslation as any).sidebar.invoiceReports).toBe('Invoice Reports')
    expect((arTranslation as any).sidebar.salesInvoices).toBe('فواتير المبيعات')
    expect((arTranslation as any).sidebar.invoiceReports).toBe('تقارير الفواتير')
  })

  it('should have non-empty Arabic translations for key badges and actions', () => {
    const arInvoices = (arTranslation as any).salesInvoices
    expect(arInvoices.page.title).toBe('فواتير المبيعات')
    expect(arInvoices.badges.status.draft).toBe('مسودة')
    expect(arInvoices.badges.status.paid).toBe('مدفوعة بالكامل')
    expect(arInvoices.badges.payment.pending).toBe('بانتظار السداد')
    expect(arInvoices.badges.type.credit_note).toBe('إشعار دائن')
    expect(arInvoices.dialogs.recordPayment.title).toBe('تسجيل دفعة على الفاتورة')
    expect(arInvoices.dialogs.void.title).toBe('إبطال فاتورة مرحّلة')
  })
})

describe('Sales Invoices Component UI Localization', () => {
  it('should render InvoiceStatusBadge in English', () => {
    currentLang = 'en'
    const { unmount } = render(<InvoiceStatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeDefined()
    unmount()

    const { unmount: unmountPaid } = render(<InvoiceStatusBadge status="paid" />)
    expect(screen.getByText('Paid')).toBeDefined()
    unmountPaid()
  })

  it('should render InvoiceStatusBadge in Arabic', () => {
    currentLang = 'ar'
    const { unmount } = render(<InvoiceStatusBadge status="draft" />)
    expect(screen.getByText('مسودة')).toBeDefined()
    unmount()

    const { unmount: unmountPaid } = render(<InvoiceStatusBadge status="paid" />)
    expect(screen.getByText('مدفوعة بالكامل')).toBeDefined()
    unmountPaid()
  })

  it('should render PaymentStatusBadge in Arabic', () => {
    currentLang = 'ar'
    const { unmount } = render(<PaymentStatusBadge status="pending" />)
    expect(screen.getByText('بانتظار السداد')).toBeDefined()
    unmount()

    const { unmount: unmountPaid } = render(<PaymentStatusBadge status="paid" />)
    expect(screen.getByText('مدفوعة بالكامل')).toBeDefined()
    unmountPaid()
  })

  it('should render InvoiceTypeBadge in Arabic', () => {
    currentLang = 'ar'
    const { unmount } = render(<InvoiceTypeBadge type="credit_note" />)
    expect(screen.getByText('إشعار دائن')).toBeDefined()
    unmount()
  })

  it('should render InvoiceDashboardCards in Arabic with localized titles', () => {
    currentLang = 'ar'
    const mockStats = {
      totalInvoiced: 15000,
      totalPaid: 10000,
      totalDue: 5000,
      totalTax: 750,
      totalDiscount: 200,
      totalInvoicesCount: 12,
      statusBreakdown: [
        { status: 'draft', count: 3 },
        { status: 'paid', count: 9 },
      ],
    }

    render(<InvoiceDashboardCards stats={mockStats} />)

    expect(screen.getByText('إجمالي المفوتر')).toBeDefined()
    expect(screen.getByText('إجمالي المحصّل')).toBeDefined()
    expect(screen.getByText('المستحقات المتبقية')).toBeDefined()
    expect(screen.getByText('الضريبة المحصلة')).toBeDefined()
    expect(screen.getByText('تصفية سريعة:')).toBeDefined()
  })
})
