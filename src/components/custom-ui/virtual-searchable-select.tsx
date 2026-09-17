'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface SearchableOption {
  id: string
  name: string
  name_ar?: string | null
  code?: string | null
  description?: string | null
  badge?: string | null
}

export interface VirtualSearchableSelectProps {
  value?: string | null
  onChange: (value: string | null) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
  className?: string
  chunkSize?: number
  itemHeight?: number
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onSearchChange?: (query: string) => void
  'aria-label'?: string
}

const DEFAULT_CHUNK_SIZE = 40
const DEFAULT_ITEM_HEIGHT = 44

export function VirtualSearchableSelect({
  value,
  onChange,
  options = [],
  placeholder,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  allowNone = true,
  noneLabel = '-- None --',
  disabled = false,
  className,
  chunkSize = DEFAULT_CHUNK_SIZE,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onSearchChange,
  'aria-label': ariaLabel,
}: VirtualSearchableSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [visibleLimit, setVisibleLimit] = React.useState(chunkSize)
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Find currently selected option across all options
  const selectedOption = React.useMemo(() => {
    if (!value || value === 'none') return null
    return options.find((opt) => opt.id === value) || null
  }, [options, value])

  // Filter options based on search query (supporting English, Arabic, code, and description)
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
      // Chunk more local items if available
      if (visibleLimit < filteredOptions.length) {
        setVisibleLimit((prev) => Math.min(prev + chunkSize, filteredOptions.length))
      }
      // Trigger async server fetch if handler provided
      if (onLoadMore && hasMore && !isLoadingMore) {
        onLoadMore()
      }
    }
  }

  // Handle Search Input Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (onSearchChange) {
      onSearchChange(val)
    }
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
          onChange(item.id)
          setOpen(false)
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

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label={ariaLabel || placeholder}
            disabled={disabled || isLoading}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full justify-between font-normal text-left h-9 text-xs py-1.5 px-3',
              'transition-all duration-150 border-input hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20',
              disabled && 'opacity-60 cursor-not-allowed bg-muted/30',
              !selectedOption && 'text-muted-foreground'
            )}
          >
            <div className='flex items-center justify-between gap-2 w-full min-w-0 pr-1'>
              {isLoading ? (
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  <span>{t('common.loading', 'Loading...')}</span>
                </div>
              ) : selectedOption ? (
                <>
                  <div className='flex items-center gap-1.5 truncate'>
                    <span className='font-medium text-foreground truncate'>
                      {selectedOption.name}
                    </span>
                    {selectedOption.code && (
                      <span className='text-muted-foreground font-mono text-[11px] shrink-0'>
                        ({selectedOption.code})
                      </span>
                    )}
                  </div>
                  {selectedOption.name_ar && (
                    <span
                      dir='rtl'
                      className='text-xs text-muted-foreground font-medium shrink-0 max-w-[45%] truncate font-sans'
                    >
                      {selectedOption.name_ar}
                    </span>
                  )}
                </>
              ) : (
                <span className='truncate text-muted-foreground'>{placeholder}</span>
              )}
            </div>

            <div className='flex items-center gap-1 shrink-0 ml-1'>
              {!disabled && selectedOption && (
                <span
                  role='button'
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onChange(null)
                    }
                  }}
                  aria-label='Clear selection'
                  className='rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                >
                  <X className='h-3.5 w-3.5' />
                </span>
              )}
              <ChevronsUpDown className='h-3.5 w-3.5 opacity-50 shrink-0' />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align='start'
          className='w-[--radix-popover-trigger-width] min-w-[280px] p-0 shadow-lg border-border/80 rounded-lg overflow-hidden'
        >
          {/* Search Header */}
          <div className='flex items-center gap-2 border-b bg-muted/20 px-2.5 py-1.5'>
            <Search className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className='h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-1 bg-transparent placeholder:text-muted-foreground/70'
            />
            {searchQuery && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => {
                  setSearchQuery('')
                  if (onSearchChange) onSearchChange('')
                }}
                className='h-5 w-5 text-muted-foreground hover:text-foreground p-0'
              >
                <X className='h-3 w-3' />
              </Button>
            )}
            <Badge
              variant='secondary'
              className='text-[10px] font-mono text-muted-foreground px-1 py-0 shrink-0'
            >
              {filteredOptions.length}
            </Badge>
          </div>

          {/* None Option */}
          {allowNone && !searchQuery && (
            <div
              role='option'
              aria-selected={!value || value === 'none'}
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={cn(
                'flex items-center px-2.5 py-1.5 text-xs text-muted-foreground italic cursor-pointer hover:bg-muted/60 transition-colors border-b border-border/40',
                (!value || value === 'none') && 'bg-primary/5 text-primary font-medium'
              )}
            >
              <Check
                className={cn(
                  'mr-2 h-3.5 w-3.5 shrink-0',
                  !value || value === 'none' ? 'opacity-100 text-primary' : 'opacity-0'
                )}
              />
              <span>{noneLabel}</span>
            </div>
          )}

          {/* Virtual List Scroll Container */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className='max-h-60 overflow-y-auto overscroll-contain p-1'
            role='listbox'
            tabIndex={0}
            aria-label={placeholder}
          >
            {isLoading ? (
              <div className='flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin text-primary mb-1.5' />
                <span>{t('common.loading', 'Loading options...')}</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className='py-6 px-3 text-center text-xs text-muted-foreground'>
                <p>{emptyText}</p>
                {searchQuery && (
                  <Button
                    type='button'
                    variant='link'
                    size='sm'
                    onClick={() => {
                      setSearchQuery('')
                      if (onSearchChange) onSearchChange('')
                    }}
                    className='text-xs text-primary h-auto p-0 mt-1'
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

                  const isSelected = opt.id === value
                  const isHighlighted = activeIndex === virtualRow.index

                  return (
                    <div
                      key={opt.id}
                      role='option'
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.id)
                        setOpen(false)
                      }}
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
                        'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                        isSelected && 'bg-primary/10 text-primary font-medium',
                        isHighlighted && !isSelected && 'bg-muted/80 text-foreground',
                        !isSelected && !isHighlighted && 'hover:bg-muted/60'
                      )}
                    >
                      <div className='flex items-center gap-2 min-w-0 flex-1 pr-1'>
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isSelected ? 'opacity-100 text-primary' : 'opacity-0'
                          )}
                        />
                        <div className='flex flex-col min-w-0 truncate'>
                          <div className='flex items-center gap-1.5 truncate'>
                            <span
                              className={cn(
                                'truncate',
                                isSelected ? 'font-semibold text-primary' : 'font-medium'
                              )}
                            >
                              {opt.name}
                            </span>
                            {opt.code && (
                              <span className='text-[10px] text-muted-foreground font-mono shrink-0'>
                                ({opt.code})
                              </span>
                            )}
                            {opt.badge && (
                              <span className='text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground shrink-0'>
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.description && (
                            <span className='text-[11px] text-muted-foreground/80 truncate'>
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {opt.name_ar && (
                        <span
                          dir='rtl'
                          className={cn(
                            'text-xs shrink-0 max-w-[45%] truncate font-sans',
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

            {/* Subtle indicator when more items can be loaded */}
            {(isLoadingMore || (hasMore && !isLoading)) && (
              <div className='flex items-center justify-center py-2 text-[11px] text-muted-foreground border-t border-border/30 mt-1'>
                {isLoadingMore ? (
                  <div className='flex items-center gap-1.5'>
                    <Loader2 className='h-3 w-3 animate-spin text-primary' />
                    <span>{t('common.loadingMore', 'Loading more...')}</span>
                  </div>
                ) : (
                  <span>{t('common.scrollForMore', 'Scroll down to load more')}</span>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
