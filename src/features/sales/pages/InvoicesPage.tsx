'use client'

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { useInvoices } from '../hooks/use-invoices'
import { InvoicesTable } from '../components/InvoicesTable'
import { InvoiceDetailView } from '../components/InvoiceDetailView'
import { InvoicesFilter } from '../components/InvoicesFilter'

export function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  
  const { data, isLoading, isError, error } = useInvoices({
    page,
    limit: 10,
    search,
    status
  })

  // Columns definition could be decoupled, but placed here for context binding
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'invoice_no',
      header: 'Invoice No',
    },
    {
      accessorKey: 'invoice_date',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.invoice_date).toLocaleString(),
    },
    {
      accessorKey: 'branches.name',
      header: 'Branch',
      cell: ({ row }) => row.original.branches?.name || 'N/A',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const val = row.original.status
        const variant = val === 'paid' ? 'default' : val === 'draft' ? 'secondary' : 'outline'
        return <Badge variant={variant} className="capitalize">{val}</Badge>
      }
    },
    {
      accessorKey: 'total_amount',
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(Number(row.original.total_amount))}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Invoices</h1>
          <p className="text-muted-foreground">Manage and view your sales transactions.</p>
        </div>
      </div>

      <InvoicesFilter 
        search={search} onSearchChange={(v: string) => { setSearch(v); setPage(1) }}
        status={status} onStatusChange={(v: string | undefined) => { setStatus(v); setPage(1) }}
      />

      {isError ? (
        <div className="p-4 bg-red-50 text-red-500 rounded-md border border-red-200">
          Error loading invoices: {error?.message}
        </div>
      ) : (
        <>
          <InvoicesTable 
            data={data?.invoices || []} 
            columns={columns} 
            isLoading={isLoading} 
            onRowClick={(row) => setSelectedInvoice(row)}
          />
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Showing page {data?.meta?.page || 1} of {data?.meta?.totalPages || 1}
            </span>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={!data?.meta || page >= data.meta.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedInvoice && (
        <InvoiceDetailView 
          invoice={selectedInvoice} 
          open={!!selectedInvoice} 
          onOpenChange={(open) => {
            if (!open) setSelectedInvoice(null)
          }} 
        />
      )}
    </div>
  )
}
