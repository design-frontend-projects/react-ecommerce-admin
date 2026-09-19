import React from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { InvoiceDetailView } from '../components/invoice-detail-view'
import { useSalesInvoice } from '../hooks/use-sales-invoices'
import { Receipt, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

export const SalesInvoiceDetailPage: React.FC = () => {
  const { invoiceId } = useParams({ strict: false }) as { invoiceId: string }
  const { data: invoice, isLoading, error } = useSalesInvoice(invoiceId)

  if (isLoading) {
    return (
      <>
        <Header>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Sales Invoice</h1>
          </div>
        </Header>
        <Main>
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Main>
      </>
    )
  }

  if (error || !invoice) {
    return (
      <>
        <Header>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Sales Invoice</h1>
          </div>
        </Header>
        <Main>
          <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <h2 className="text-lg font-bold">Invoice Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The requested invoice could not be loaded or you do not have permission to view it.
            </p>
            <Button asChild variant="outline">
              <Link to="/sales-invoices">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invoices
              </Link>
            </Button>
          </div>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">{invoice.invoice_no}</h1>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <InvoiceDetailView invoice={invoice} />
      </Main>
    </>
  )
}
