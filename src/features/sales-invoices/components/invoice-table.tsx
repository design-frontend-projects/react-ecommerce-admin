import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InvoiceStatusBadge, PaymentStatusBadge, InvoiceTypeBadge } from './invoice-status-badge'
import type { SalesInvoice } from '../types'
import {
  MoreHorizontal,
  Eye,
  CreditCard,
  Printer,
  CheckCircle,
  XCircle,
  Ban,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface InvoiceTableProps {
  data: SalesInvoice[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  isLoading?: boolean
  onPageChange: (newPage: number) => void
  onRecordPayment: (invoice: SalesInvoice) => void
  onIssueInvoice: (invoice: SalesInvoice) => void
  onCancelInvoice: (invoice: SalesInvoice) => void
  onVoidInvoice: (invoice: SalesInvoice) => void
  onCreateCreditNote: (invoice: SalesInvoice) => void
  onPrintInvoice: (invoice: SalesInvoice) => void
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  data,
  totalCount,
  page,
  pageSize,
  totalPages,
  isLoading,
  onPageChange,
  onRecordPayment,
  onIssueInvoice,
  onCancelInvoice,
  onVoidInvoice,
  onCreateCreditNote,
  onPrintInvoice,
}) => {
  const { t } = useTranslation()

  const columns = useMemo<ColumnDef<SalesInvoice>[]>(
    () => [
      {
        accessorKey: 'invoice_no',
        header: () => t('salesInvoices.table.invoiceNo', 'Invoice #'),
        cell: ({ row }) => {
          const inv = row.original
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Link
                  to="/sales-invoices/$invoiceId"
                  params={{ invoiceId: inv.id }}
                  className="font-semibold text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                  {inv.invoice_no}
                </Link>
                <InvoiceTypeBadge type={inv.invoice_type} />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {inv.source_type} {inv.channels?.name ? `• ${inv.channels.name}` : ''}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'invoice_date',
        header: () => t('salesInvoices.table.date', 'Date'),
        cell: ({ row }) => {
          const inv = row.original
          return (
            <div className="flex flex-col text-xs">
              <span className="font-medium text-foreground">
                {new Date(inv.invoice_date).toLocaleDateString()}
              </span>
              {inv.due_date && (
                <span className="text-[11px] text-muted-foreground">
                  {t('salesInvoices.table.dueDate', 'Due: {{date}}', {
                    date: new Date(inv.due_date).toLocaleDateString(),
                  })}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'customer',
        header: () => t('salesInvoices.table.customer', 'Customer'),
        cell: ({ row }) => {
          const c = row.original.customers
          if (!c) {
            return (
              <span className="text-xs text-muted-foreground italic">
                {t('salesInvoices.table.walkInCustomer', 'Walk-in Customer')}
              </span>
            )
          }
          const name =
            c.company_name ||
            [c.first_name, c.last_name].filter(Boolean).join(' ') ||
            t('salesInvoices.table.retailCustomer', 'Customer')
          return (
            <div className="flex flex-col text-xs">
              <span className="font-medium text-foreground">{name}</span>
              {c.phone && <span className="text-[11px] text-muted-foreground">{c.phone}</span>}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: () => t('salesInvoices.table.status', 'Status'),
        cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'payment_status',
        header: () => t('salesInvoices.table.payment', 'Payment'),
        cell: ({ row }) => <PaymentStatusBadge status={row.original.payment_status} />,
      },
      {
        accessorKey: 'total_amount',
        header: () => <div className="text-right">{t('salesInvoices.table.total', 'Total')}</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-foreground text-sm">
            ${row.original.total_amount.toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: 'paid_amount',
        header: () => <div className="text-right">{t('salesInvoices.table.paid', 'Paid')}</div>,
        cell: ({ row }) => (
          <div className="text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ${row.original.paid_amount.toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: 'due_amount',
        header: () => <div className="text-right">{t('salesInvoices.table.due', 'Due')}</div>,
        cell: ({ row }) => {
          const due = row.original.due_amount
          return (
            <div
              className={`text-right text-xs font-semibold ${
                due > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              }`}
            >
              ${due.toFixed(2)}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: () => <div className="w-8"></div>,
        cell: ({ row }) => {
          const inv = row.original
          const isDraft = inv.status === 'draft'
          const isPaid = inv.status === 'paid' || inv.payment_status === 'paid'
          const isVoidOrCancelled = inv.status === 'void' || inv.status === 'cancelled'

          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">
                      {t('salesInvoices.table.openMenu', 'Open menu')}
                    </span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">
                    {t('salesInvoices.table.invoiceActions', 'Invoice Actions')}
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/sales-invoices/$invoiceId"
                      params={{ invoiceId: inv.id }}
                      className="cursor-pointer gap-2"
                    >
                      <Eye className="w-4 h-4 text-blue-500" />
                      {t('salesInvoices.table.viewInvoice', 'View Invoice')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onPrintInvoice(inv)}
                    className="cursor-pointer gap-2"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    {t('salesInvoices.table.printThermal', 'Print / Thermal')}
                  </DropdownMenuItem>

                  {!isVoidOrCancelled && inv.due_amount > 0 && (
                    <DropdownMenuItem
                      onClick={() => onRecordPayment(inv)}
                      className="cursor-pointer gap-2 text-emerald-600 focus:text-emerald-700"
                    >
                      <CreditCard className="w-4 h-4" />
                      {t('salesInvoices.table.recordPayment', 'Record Payment')}
                    </DropdownMenuItem>
                  )}

                  {isDraft && (
                    <DropdownMenuItem
                      onClick={() => onIssueInvoice(inv)}
                      className="cursor-pointer gap-2 text-blue-600"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t('salesInvoices.table.issueInvoice', 'Issue Invoice')}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {!isVoidOrCancelled && (
                    <DropdownMenuItem
                      onClick={() => onCreateCreditNote(inv)}
                      className="cursor-pointer gap-2 text-amber-600"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      {t('salesInvoices.table.creditNote', 'Credit Note')}
                    </DropdownMenuItem>
                  )}

                  {!isPaid && !isVoidOrCancelled && (
                    <DropdownMenuItem
                      onClick={() => onCancelInvoice(inv)}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('salesInvoices.table.cancelInvoice', 'Cancel Invoice')}
                    </DropdownMenuItem>
                  )}

                  {!isVoidOrCancelled && inv.status !== 'draft' && (
                    <DropdownMenuItem
                      onClick={() => onVoidInvoice(inv)}
                      className="cursor-pointer gap-2 text-purple-700 focus:text-purple-800"
                    >
                      <Ban className="w-4 h-4" />
                      {t('salesInvoices.table.voidAccounting', 'Void (Accounting)')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [
      t,
      onCancelInvoice,
      onCreateCreditNote,
      onIssueInvoice,
      onPrintInvoice,
      onRecordPayment,
      onVoidInvoice,
    ]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-semibold py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length} className="h-14 text-center">
                    <div className="h-4 bg-muted/60 rounded animate-pulse w-3/4 mx-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                  {t(
                    'salesInvoices.table.noResults',
                    'No sales invoices found matching your criteria.'
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
        <div>
          {t('salesInvoices.table.pagination', 'Showing {{from}} to {{to}} of {{total}} invoices', {
            from: data.length > 0 ? (page - 1) * pageSize + 1 : 0,
            to: Math.min(page * pageSize, totalCount),
            total: totalCount,
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 font-medium text-foreground">
            {t('salesInvoices.table.pageOf', 'Page {{page}} of {{totalPages}}', {
              page,
              totalPages: Math.max(1, totalPages),
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
