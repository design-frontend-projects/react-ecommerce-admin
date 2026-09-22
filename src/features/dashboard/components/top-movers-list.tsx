import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ArrowDownRight, Flame, Minus, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { TopMoverItem } from '../types'

interface TopMoversListProps {
  movers: TopMoverItem[]
}

export function TopMoversList({ movers }: TopMoversListProps) {
  return (
    <Card className='border border-border/60 bg-card/60 backdrop-blur-md shadow-xs flex flex-col'>
      <CardHeader className='p-5 pb-3 flex flex-row items-center justify-between gap-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <Flame className='w-4 h-4 text-orange-500' />
            <CardTitle className='text-base font-semibold text-foreground'>
              Velocity & Top Movers
            </CardTitle>
          </div>
          <CardDescription className='text-xs text-muted-foreground'>
            Fastest turning SKUs across all warehouse channels (past 30 days)
          </CardDescription>
        </div>

        <Badge variant='outline' className='text-xs font-semibold'>
          Top {movers.length}
        </Badge>
      </CardHeader>

      <CardContent className='p-0 flex-1 flex flex-col justify-between'>
        {movers.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground my-auto'>
            <Flame className='w-8 h-8 text-orange-400 mb-2 opacity-60' />
            <p className='text-sm font-semibold text-foreground'>No Recent Stock Activity</p>
            <p className='text-xs max-w-xs'>
              Record sales or warehouse transfers to start measuring product turnover velocity.
            </p>
          </div>
        ) : (
          <div className='divide-y divide-border/30'>
            {movers.slice(0, 8).map((item, idx) => (
              <div
                key={item.variantId}
                className='flex items-center justify-between p-3.5 px-5 hover:bg-muted/30 transition-colors'
              >
                {/* Rank & Product Info */}
                <div className='flex items-center gap-3 min-w-0 pr-2'>
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                        : idx === 1
                        ? 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-500/40'
                        : idx === 2
                        ? 'bg-orange-700/20 text-orange-700 dark:text-orange-400 border border-orange-700/40'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div className='min-w-0 space-y-0.5'>
                    <span className='font-semibold text-xs text-foreground block truncate max-w-[180px] sm:max-w-xs' title={item.productName}>
                      {item.productName}
                    </span>
                    <div className='flex items-center gap-2 text-[11px] text-muted-foreground font-mono'>
                      <span>{item.sku}</span>
                      <span>•</span>
                      <span className='font-sans text-[10px]'>{item.categoryName}</span>
                    </div>
                  </div>
                </div>

                {/* Movements & Velocity Badges */}
                <div className='flex items-center gap-3 shrink-0'>
                  <div className='text-right space-y-0.5'>
                    <div className='flex items-center justify-end gap-1.5 text-xs font-semibold'>
                      <span className='text-rose-600 dark:text-rose-400'>
                        -{item.outboundQty.toLocaleString()}
                      </span>
                      <span className='text-muted-foreground font-normal text-[11px]'>/</span>
                      <span className='text-emerald-600 dark:text-emerald-400'>
                        +{item.inboundQty.toLocaleString()}
                      </span>
                    </div>
                    <span className='text-[10px] text-muted-foreground block'>
                      {item.totalMovements} operations
                    </span>
                  </div>

                  {/* Trend Indicator */}
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      item.trend === 'up'
                        ? 'bg-rose-500/10 text-rose-500'
                        : item.trend === 'down'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    title={
                      item.trend === 'up'
                        ? 'High outflow / outbound demand'
                        : item.trend === 'down'
                        ? 'Inflow replenishment dominant'
                        : 'Balanced velocity'
                    }
                  >
                    {item.trend === 'up' && <ArrowUpRight className='w-3.5 h-3.5' />}
                    {item.trend === 'down' && <ArrowDownRight className='w-3.5 h-3.5' />}
                    {item.trend === 'neutral' && <Minus className='w-3.5 h-3.5' />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className='p-3 text-center border-t border-border/40 text-xs'>
          <Link
            to='/inventory-movements'
            className='text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]'
          >
            <span>View all inventory movements & audit trail</span>
            <ExternalLink className='w-3 h-3' />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
