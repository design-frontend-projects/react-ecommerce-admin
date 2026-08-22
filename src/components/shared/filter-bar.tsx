import React from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  warehouseOptions?: FilterOption[]
  selectedWarehouse?: string
  onWarehouseChange?: (value: string) => void
  statusOptions?: FilterOption[]
  selectedStatus?: string
  onStatusChange?: (value: string) => void
  categoryOptions?: FilterOption[]
  selectedCategory?: string
  onCategoryChange?: (value: string) => void
  extraFilters?: React.ReactNode
  onReset?: () => void
  className?: string
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search by code, reference or item...',
  warehouseOptions,
  selectedWarehouse,
  onWarehouseChange,
  statusOptions,
  selectedStatus,
  onStatusChange,
  categoryOptions,
  selectedCategory,
  onCategoryChange,
  extraFilters,
  onReset,
  className,
}: FilterBarProps) {
  const hasActiveFilters = Boolean(
    searchTerm ||
      (selectedWarehouse && selectedWarehouse !== 'all') ||
      (selectedStatus && selectedStatus !== 'all') ||
      (selectedCategory && selectedCategory !== 'all')
  )

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 p-3 rounded-lg border bg-card/60 backdrop-blur-xs shadow-xs',
        className
      )}
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Warehouse Selector */}
      {warehouseOptions && onWarehouseChange && (
        <div className="min-w-[160px]">
          <Select value={selectedWarehouse || 'all'} onValueChange={onWarehouseChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Warehouses / Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses / Stores</SelectItem>
              {warehouseOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status Selector */}
      {statusOptions && onStatusChange && (
        <div className="min-w-[140px]">
          <Select value={selectedStatus || 'all'} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category Selector */}
      {categoryOptions && onCategoryChange && (
        <div className="min-w-[150px]">
          <Select value={selectedCategory || 'all'} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Extra Custom Filters */}
      {extraFilters}

      {/* Reset Filter Button */}
      {hasActiveFilters && onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <Filter className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  )
}
