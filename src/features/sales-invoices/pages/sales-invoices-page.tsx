import React, { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { InvoiceDashboardCards } from '../components/invoice-dashboard-cards'
import { InvoiceFiltersBar } from '../components/invoice-filters-bar'
import { InvoiceTable } from '../components/invoice-table'
import { RecordPaymentDialog } from '../components/record-payment-dialog'
import { CancelInvoiceDialog } from '../components/cancel-invoice-dialog'
import { VoidInvoiceDialog } from '../components/void-invoice-dialog'
import { CreditNoteDialog } from '../components/credit-note-dialog'
import { InvoicePrintView } from '../components/invoice-print-view'
import {
  useSalesInvoices,
  useInvoiceDashboard,
  useRecordPayment,
  useIssueInvoice,
  useCancelInvoice,
  useVoidInvoice,
  useCreateCreditNote,
} from '../hooks/use-sales-invoices'
import type { InvoiceFiltersState, SalesInvoice } from '../types'
import { Receipt, LineChart, Plus } from 'lucide-react'

export const SalesInvoicesPage: React.FC = () => {
  const [filters, setFilters] = useState<InvoiceFiltersState>({
    page: 1,
    pageSize: 15,
    status: 'all',
    paymentStatus: 'all',
    invoiceType: 'all',
    sortBy: 'invoice_date',
    sortOrder: 'desc',
  })

  // Dialog states
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Data queries
  const { data: invoicesData, isLoading: isLoadingList } = useSalesInvoices(filters)
  const { data: statsData, isLoading: isLoadingStats } = useInvoiceDashboard()

  // Mutations
  const recordPayment = useRecordPayment()
  const issueInvoice = useIssueInvoice()
  const cancelInvoice = useCancelInvoice()
  const voidInvoice = useVoidInvoice()
  const createCreditNote = useCreateCreditNote()

  const handleFilterStatus = (status: string) => {
    setFilters((prev) => ({ ...prev, status: status as any, page: 1 }))
  }

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      pageSize: 15,
      status: 'all',
      paymentStatus: 'all',
      invoiceType: 'all',
      sortBy: 'invoice_date',
      sortOrder: 'desc',
    })
  }

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Sales Invoices</h1>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6 pb-12">
          {/* Top Bar with actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Invoices & Financial Receivables
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-tenant commercial document management for POS and Sales Orders
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/sales-invoices/reports">
                  <LineChart className="w-4 h-4 mr-1.5" />
                  Financial Reports
                </Link>
              </Button>
            </div>
          </div>

          {/* KPI Dashboard */}
          <InvoiceDashboardCards
            stats={statsData}
            isLoading={isLoadingStats}
            onFilterStatus={handleFilterStatus}
          />

          {/* Filters Bar */}
          <InvoiceFiltersBar
            filters={filters}
            onFiltersChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
            onReset={handleResetFilters}
          />

          {/* Main Invoices Table */}
          <InvoiceTable
            data={invoicesData?.items || []}
            totalCount={invoicesData?.total || 0}
            page={filters.page}
            pageSize={filters.pageSize}
            totalPages={invoicesData?.totalPages || 1}
            isLoading={isLoadingList}
            onPageChange={(newPage) => setFilters((prev) => ({ ...prev, page: newPage }))}
            onRecordPayment={(inv) => {
              setSelectedInvoice(inv)
              setShowPaymentDialog(true)
            }}
            onIssueInvoice={(inv) => issueInvoice.mutate(inv.id)}
            onCancelInvoice={(inv) => {
              setSelectedInvoice(inv)
              setShowCancelDialog(true)
            }}
            onVoidInvoice={(inv) => {
              setSelectedInvoice(inv)
              setShowVoidDialog(true)
            }}
            onCreateCreditNote={(inv) => {
              setSelectedInvoice(inv)
              setShowCreditNoteDialog(true)
            }}
            onPrintInvoice={(inv) => {
              setSelectedInvoice(inv)
              setShowPrintModal(true)
            }}
          />
        </div>
      </Main>

      {/* Dialog Modals */}
      <RecordPaymentDialog
        invoice={selectedInvoice}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSubmit={async (data) => {
          if (selectedInvoice) {
            await recordPayment.mutateAsync({ invoiceId: selectedInvoice.id, payment: data })
          }
        }}
        isSubmitting={recordPayment.isPending}
      />

      <CancelInvoiceDialog
        invoice={selectedInvoice}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onSubmit={async (data) => {
          if (selectedInvoice) {
            await cancelInvoice.mutateAsync({ id: selectedInvoice.id, payload: data })
          }
        }}
        isSubmitting={cancelInvoice.isPending}
      />

      <VoidInvoiceDialog
        invoice={selectedInvoice}
        open={showVoidDialog}
        onOpenChange={setShowVoidDialog}
        onSubmit={async (data) => {
          if (selectedInvoice) {
            await voidInvoice.mutateAsync({ id: selectedInvoice.id, payload: data })
          }
        }}
        isSubmitting={voidInvoice.isPending}
      />

      <CreditNoteDialog
        invoice={selectedInvoice}
        open={showCreditNoteDialog}
        onOpenChange={setShowCreditNoteDialog}
        onSubmit={async (data) => {
          if (selectedInvoice) {
            await createCreditNote.mutateAsync({
              originalInvoiceId: selectedInvoice.id,
              payload: data,
            })
          }
        }}
        isSubmitting={createCreditNote.isPending}
      />

      <InvoicePrintView
        invoice={selectedInvoice}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
      />
    </>
  )
}
