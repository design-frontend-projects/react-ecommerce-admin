import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { InvoiceFiltersState, InvoiceStatus, InvoicePaymentStatus, InvoiceType } from '../types'
import { Search, X, SlidersHorizontal, Calendar } from 'lucide-react'

interface InvoiceFiltersBarProps {
  filters: InvoiceFiltersState
  onFiltersChange: (next: Partial<InvoiceFiltersState>) => void
  onReset: () => void
}

export const InvoiceFiltersBar: React.FC<InvoiceFiltersBarProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.status !== 'all' ||
    filters.paymentStatus !== 'all' ||
    filters.invoiceType !== 'all' ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo)

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5 shadow-2xs">
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ search: e.target.value, page: 1 })}
            placeholder="Search invoice #, customer name, email, or notes..."
            className="pl-9 pr-8 h-9 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: '', page: 1 })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status selector */}
        <div className="w-full md:w-44">
          <Select
            value={filters.status || 'all'}
            onValueChange={(val) => onFiltersChange({ status: val as InvoiceStatus | 'all', page: 1 })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="void">Void</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Status selector */}
        <div className="w-full md:w-44">
          <Select
            value={filters.paymentStatus || 'all'}
            onValueChange={(val) =>
              onFiltersChange({ paymentStatus: val as InvoicePaymentStatus | 'all', page: 1 })
            }
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overpaid">Overpaid</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoice Type */}
        <div className="w-full md:w-36">
          <Select
            value={filters.invoiceType || 'all'}
            onValueChange={(val) =>
              onFiltersChange({ invoiceType: val as InvoiceType | 'all', page: 1 })
            }
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="credit_note">Credit Note</SelectItem>
              <SelectItem value="debit_note">Debit Note</SelectItem>
              <SelectItem value="proforma">Proforma</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Inputs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative">
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onFiltersChange({ dateFrom: e.target.value, page: 1 })}
              className="h-9 text-xs w-36 pl-8"
              title="From Date"
            />
            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <span className="text-muted-foreground text-xs">to</span>
          <div className="relative">
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onFiltersChange({ dateTo: e.target.value, page: 1 })}
              className="h-9 text-xs w-36 pl-8"
              title="To Date"
            />
            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
