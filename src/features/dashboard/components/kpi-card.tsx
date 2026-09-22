import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: string
  subValue?: string
  change?: number
  changeLabel?: string
  icon: ReactNode
  accentColor?: string // e.g. 'blue' | 'emerald' | 'violet' | 'amber' | 'cyan' | 'rose'
  progressValue?: number // 0 to 100 for mini bar
  onClick?: () => void
}

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'hover:border-blue-500/40',
    bar: 'bg-blue-500',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'hover:border-violet-500/40',
    bar: 'bg-violet-500',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-500/40',
    bar: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-500/40',
    bar: 'bg-amber-500',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'hover:border-cyan-500/40',
    bar: 'bg-cyan-500',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'hover:border-rose-500/40',
    bar: 'bg-rose-500',
  },
}

export function KpiCard({
  title,
  value,
  subValue,
  change,
  changeLabel = 'vs last period',
  icon,
  accentColor = 'blue',
  progressValue,
  onClick,
}: KpiCardProps) {
  const style = ACCENT_STYLES[accentColor] || ACCENT_STYLES.blue
  const isPositive = typeof change === 'number' && change > 0
  const isNegative = typeof change === 'number' && change < 0
  const isNeutral = typeof change === 'number' && change === 0

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={onClick ? 'cursor-pointer' : undefined}
      onClick={onClick}
    >
      <Card
        className={`relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur-md transition-all shadow-xs hover:shadow-md ${style.border}`}
      >
        <CardContent className='p-4 sm:p-5 flex flex-col justify-between h-full'>
          {/* Header Row: Title & Styled Icon */}
          <div className='flex items-start justify-between gap-2 mb-3'>
            <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              {title}
            </span>
            <div className={`p-2 rounded-xl ${style.bg} ${style.text} flex items-center justify-center shrink-0`}>
              {icon}
            </div>
          </div>

          {/* Metric Value */}
          <div className='space-y-1 mb-2'>
            <div className='text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate'>
              {value}
            </div>
            {subValue && (
              <p className='text-xs text-muted-foreground truncate'>{subValue}</p>
            )}
          </div>

          {/* Mini progress line if provided */}
          {typeof progressValue === 'number' && (
            <div className='w-full h-1.5 bg-muted/60 rounded-full overflow-hidden my-2'>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${style.bar}`}
              />
            </div>
          )}

          {/* Trend Delta indicator */}
          {typeof change === 'number' && (
            <div className='flex items-center gap-1.5 pt-1 text-xs'>
              <span
                className={`inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-sm ${
                  isPositive
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : isNegative
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                    : 'text-muted-foreground bg-muted'
                }`}
              >
                {isPositive && <TrendingUp className='w-3 h-3' />}
                {isNegative && <TrendingDown className='w-3 h-3' />}
                {isNeutral && <Minus className='w-3 h-3' />}
                <span>
                  {isPositive ? '+' : ''}
                  {change}%
                </span>
              </span>
              <span className='text-muted-foreground text-[11px] truncate'>
                {changeLabel}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
