import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface PODatePickerProps {
  value?: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  placeholder?: string
  clearable?: boolean
  compact?: boolean
  className?: string
  buttonClassName?: string
  id?: string
}

/**
 * Safely parse a date string (YYYY-MM-DD or ISO string) into a local Date object,
 * preventing timezone offsets from shifting the selected date backwards.
 */
export function parseDateString(dateStr?: string | null): Date | undefined {
  if (!dateStr) return undefined
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const parts = cleanStr.split('-')
  if (parts.length < 3) {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? undefined : d
  }
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined
  return new Date(year, month - 1, day)
}

export function PODatePicker({
  value,
  onChange,
  disabled = false,
  placeholder,
  clearable = false,
  compact = false,
  className,
  buttonClassName,
  id,
}: PODatePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const selectedDate = parseDateString(value)
  const displayPlaceholder =
    placeholder ?? t('common.selectDate', 'Pick a date')

  const formattedValue = selectedDate
    ? format(selectedDate, compact ? 'yyyy-MM-dd' : 'MMM dd, yyyy')
    : ''

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type='button'
            variant='outline'
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal bg-background text-left transition-colors',
              compact
                ? 'h-8 px-2 text-xs font-mono'
                : 'h-9 px-3 text-xs sm:text-sm',
              !selectedDate && 'text-muted-foreground',
              buttonClassName
            )}
          >
            <div className='flex items-center gap-1.5 truncate'>
              <CalendarIcon
                className={cn(
                  'shrink-0 text-muted-foreground',
                  compact ? 'h-3 w-3' : 'h-3.5 w-3.5'
                )}
              />
              <span className='truncate'>
                {formattedValue || displayPlaceholder}
              </span>
            </div>
            {clearable && selectedDate && !disabled ? (
              <span
                role='button'
                tabIndex={0}
                aria-label={t('common.clear', 'Clear')}
                className='ml-auto -mr-1 p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors'
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(null)
                  }
                }}
              >
                <X className='h-3 w-3' />
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent className='w-auto p-0' align='start'>
          <div className='flex items-center justify-between p-2 border-b bg-muted/20'>
            <span className='text-xs font-medium text-muted-foreground'>
              {displayPlaceholder}
            </span>
            <div className='flex items-center gap-1'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-6 px-2 text-[11px]'
                onClick={() => {
                  onChange(format(new Date(), 'yyyy-MM-dd'))
                  setOpen(false)
                }}
              >
                {t('common.today', 'Today')}
              </Button>
              {clearable && selectedDate && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive'
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                >
                  {t('common.clear', 'Clear')}
                </Button>
              )}
            </div>
          </div>
          <Calendar
            mode='single'
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, 'yyyy-MM-dd'))
                setOpen(false)
              } else if (clearable) {
                onChange(null)
                setOpen(false)
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
