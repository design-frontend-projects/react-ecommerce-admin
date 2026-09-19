'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronsUpDown, Loader2, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { SearchableOption } from './virtual-searchable-select'

export type { SearchableOption }

export interface VirtualSearchableMultiSelectProps {
  values?: string[]
  onChange: (values: string[]) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  chunkSize?: number
  itemHeight?: number
  isLoading?: boolean
  maxBadgeDisplay?: number
  showBadgesBelow?: boolean
  'aria-label'?: string
}

const DEFAULT_CHUNK_SIZE = 40
const DEFAULT_ITEM_HEIGHT = 44

export function VirtualSearchableMultiSelect({
  values = [],
  onChange,
  options = [],
  placeholder,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  className,
  chunkSize = DEFAULT_CHUNK_SIZE,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  isLoading = false,
  maxBadgeDisplay = 6,
  showBadgesBelow = true,
  'aria-label': ariaLabel,
}: VirtualSearchableMultiSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [visibleLimit, setVisibleLimit] = React.useState(chunkSize)
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Fast lookup set for selected ids
  const selectedSet = React.useMemo(() => new Set(values), [values])

  // Map of options by ID for quick tag rendering
  const optionsMap = React.useMemo(() => {
    const map = new Map<string, SearchableOption>()
    options.forEach((opt) => map.set(opt.id, opt))
    return map
  }, [options])

  // Selected options objects
  const selectedOptions = React.useMemo(() => {
    return values.map((id) => optionsMap.get(id)).filter(Boolean) as SearchableOption[]
  }, [values, optionsMap])

  // Filter options based on search query (English, Arabic, code, description, badge)
  const filteredOptions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return options

    return options.filter((opt) => {
      const nameEn = (opt.name || '').toLowerCase()
      const nameAr = (opt.name_ar || '').toLowerCase()
      const code = (opt.code || '').toLowerCase()
      const desc = (opt.description || '').toLowerCase()
      const badge = (opt.badge || '').toLowerCase()

      return (
        nameEn.includes(q) ||
        nameAr.includes(q) ||
        code.includes(q) ||
        desc.includes(q) ||
        badge.includes(q)
      )
    })
  }, [options, searchQuery])

  // Reset lazy chunking & active index when search changes or popover opens
  React.useEffect(() => {
    setVisibleLimit(chunkSize)
    setActiveIndex(-1)
  }, [searchQuery, open, chunkSize])

  // Auto-focus search input when opening
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Slice displayed items for client-side progressive chunking
  const displayedItems = React.useMemo(() => {
    return filteredOptions.slice(0, visibleLimit)
  }, [filteredOptions, visibleLimit])

  // TanStack Virtualizer configuration
  const rowVirtualizer = useVirtualizer({
    count: displayedItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
    initialRect: { width: 320, height: 260 },
  })

  // Lazy loading when scrolling towards bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = (e.currentTarget || e.target) as HTMLDivElement
    if (!el) return
    const scrollTop = el.scrollTop || 0
    const scrollHeight = el.scrollHeight || 0
    const clientHeight = el.clientHeight || 0

    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleLimit < filteredOptions.length) {
        setVisibleLimit((prev) => Math.min(prev + chunkSize, filteredOptions.length))
      }
    }
  }

  // Toggle single item selection
  const handleToggleItem = (id: string) => {
    const next = new Set(selectedSet)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(Array.from(next))
  }

  // Select all currently filtered items
  const handleSelectAllFiltered = () => {
    const next = new Set(selectedSet)
    filteredOptions.forEach((opt) => next.add(opt.id))
    onChange(Array.from(next))
  }

  // Deselect all currently filtered items
  const handleDeselectFiltered = () => {
    const filteredIdSet = new Set(filteredOptions.map((opt) => opt.id))
    const next = values.filter((id) => !filteredIdSet.has(id))
    onChange(next)
  }

  // Clear all selections
  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    onChange([])
  }

  // Remove single badge
  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = values.filter((v) => v !== id)
    onChange(next)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) =>
          prev < displayedItems.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : displayedItems.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < displayedItems.length) {
          const item = displayedItems[activeIndex]
          handleToggleItem(item.id)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  // Scroll active item into view during keyboard navigation
  React.useEffect(() => {
    if (activeIndex >= 0 && rowVirtualizer) {
      rowVirtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    }
  }, [activeIndex, rowVirtualizer])

  const virtualItems = rowVirtualizer.getVirtualItems()

  // Headless/JSDOM resilient fallback
  const itemsToRender =
    virtualItems.length > 0
      ? virtualItems
      : displayedItems.map((_, i) => ({
          index: i,
          start: i * itemHeight,
          size: itemHeight,
        }))

  const allFilteredSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((opt) => selectedSet.has(opt.id))

  return (
    <div className={cn('relative w-full space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel || placeholder}
            disabled={disabled || isLoading}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full justify-between font-normal text-left h-9 text-xs py-1.5 px-3',
              'transition-all duration-150 border-input hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20',
              disabled && 'opacity-60 cursor-not-allowed bg-muted/30',
              values.length === 0 && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 pr-1 truncate">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('common.loading', 'Loading...')}</span>
                </div>
              ) : values.length > 0 ? (
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Badge
                    variant="secondary"
                    className="font-medium text-[11px] px-1.5 py-0 h-5 shrink-0 bg-primary/15 text-primary border-primary/20"
                  >
                    {values.length} selected
                  </Badge>
                  <span className="font-medium text-foreground truncate text-xs">
                    {selectedOptions.slice(0, 2).map((o) => o.name).join(', ')}
                    {values.length > 2 ? ` +${values.length - 2} more` : ''}
                  </span>
                </div>
              ) : (
                <span className="truncate text-muted-foreground">{placeholder}</span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {!disabled && values.length > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClearAll}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleClearAll()
                    }
                  }}
                  aria-label="Clear all selections"
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] min-w-[300px] p-0 shadow-lg border-border/80 rounded-lg overflow-hidden"
        >
          {/* Search Header */}
          <div className="flex items-center gap-2 border-b bg-muted/20 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="h-5 w-5 text-muted-foreground hover:text-foreground p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <Badge
              variant="secondary"
              className="text-[10px] font-mono text-muted-foreground px-1 py-0 shrink-0"
            >
              {filteredOptions.length}
            </Badge>
          </div>

          {/* Quick Selection Toolbar */}
          {filteredOptions.length > 0 && (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 border-b border-border/40 text-[11px]">
              <span className="text-muted-foreground font-medium">
                {values.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-1.5">
                {allFilteredSelected ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectFiltered}
                    className="h-6 text-[11px] px-2 py-0 text-muted-foreground hover:text-foreground"
                  >
                    Deselect All
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllFiltered}
                    className="h-6 text-[11px] px-2 py-0 text-primary font-medium hover:bg-primary/10"
                  >
                    Select All {searchQuery ? `(${filteredOptions.length})` : ''}
                  </Button>
                )}
                {values.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange([])}
                    className="h-6 text-[11px] px-2 py-0 text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Virtual List Scroll Container */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="max-h-60 overflow-y-auto overscroll-contain p-1"
            role="listbox"
            tabIndex={0}
            aria-label={placeholder}
            aria-multiselectable="true"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary mb-1.5" />
                <span>{t('common.loading', 'Loading options...')}</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-muted-foreground">
                <p>{emptyText}</p>
                {searchQuery && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-primary h-auto p-0 mt-1"
                  >
                    {t('common.clearSearch', 'Clear search')}
                  </Button>
                )}
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {itemsToRender.map((virtualRow) => {
                  const opt = displayedItems[virtualRow.index]
                  if (!opt) return null

                  const isSelected = selectedSet.has(opt.id)
                  const isHighlighted = activeIndex === virtualRow.index

                  return (
                    <div
                      key={opt.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleToggleItem(opt.id)}
                      onMouseEnter={() => setActiveIndex(virtualRow.index)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors select-none',
                        isSelected && 'bg-primary/10 text-primary font-medium',
                        isHighlighted && !isSelected && 'bg-muted/80 text-foreground',
                        !isSelected && !isHighlighted && 'hover:bg-muted/60'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleItem(opt.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-primary shrink-0"
                        />
                        <div className="flex flex-col min-w-0 truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={cn(
                                'truncate',
                                isSelected ? 'font-semibold text-primary' : 'font-medium'
                              )}
                            >
                              {opt.name}
                            </span>
                            {opt.code && (
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                ({opt.code})
                              </span>
                            )}
                            {opt.badge && (
                              <span className="text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground shrink-0 font-normal">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.description && (
                            <span className="text-[11px] text-muted-foreground/80 truncate font-normal">
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {opt.name_ar && (
                        <span
                          dir="rtl"
                          className={cn(
                            'text-xs shrink-0 max-w-[40%] truncate font-sans',
                            isSelected
                              ? 'font-semibold text-primary'
                              : 'text-muted-foreground'
                          )}
                        >
                          {opt.name_ar}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Items Badges List */}
      {showBadgesBelow && selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedOptions.slice(0, maxBadgeDisplay).map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="text-[11px] font-normal pl-2 pr-1 py-0.5 flex items-center gap-1 border border-border/70 bg-background/80 hover:bg-muted"
            >
              <span className="truncate max-w-[150px]">{item.name}</span>
              {item.code && (
                <span className="text-[9px] text-muted-foreground font-mono">
                  ({item.code})
                </span>
              )}
              <button
                type="button"
                onClick={(e) => handleRemoveItem(item.id, e)}
                aria-label={`Remove ${item.name}`}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedOptions.length > maxBadgeDisplay && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono py-0.5 text-muted-foreground"
            >
              +{selectedOptions.length - maxBadgeDisplay} more
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
