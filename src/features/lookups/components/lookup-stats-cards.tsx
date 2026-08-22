import {
  Database,
  Sparkles,
  ShieldCheck,
  GitFork,
  Activity,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { LookupTreeStats } from '../data/schema'

interface LookupStatsCardsProps {
  stats?: LookupTreeStats | null
  isLoading?: boolean
}

export function LookupStatsCards({ stats, isLoading }: LookupStatsCardsProps) {
  const cards = [
    {
      title: 'Lookup Catalogs',
      value: stats?.total_catalogs ?? 0,
      subtext: 'Registered Master Catalogs',
      icon: Database,
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Active Options',
      value: stats?.total_active_values ?? 0,
      subtext: `${stats?.total_values ?? 0} total options configured`,
      icon: Activity,
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Custom Tenant Overrides',
      value: stats?.total_custom_values ?? 0,
      subtext: 'Tenant-specific custom items',
      icon: Sparkles,
      gradient: 'from-violet-500/10 via-violet-500/5 to-transparent text-violet-600 dark:text-violet-400',
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Global System Presets',
      value: stats?.total_system_values ?? 0,
      subtext: 'Built-in standard defaults',
      icon: ShieldCheck,
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Hierarchy Depth',
      value: `${stats?.max_hierarchy_depth ?? 1} Tier${(stats?.max_hierarchy_depth ?? 1) > 1 ? 's' : ''}`,
      subtext: 'Nested parent-child depth',
      icon: GitFork,
      gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    },
  ]

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            className={`relative overflow-hidden bg-card/60 backdrop-blur-xs border ${card.border} shadow-2xs hover:shadow-xs transition-all`}
          >
            <div
              className={`absolute inset-0 bg-linear-to-br ${card.gradient} pointer-events-none opacity-50`}
            />
            <CardContent className='p-3.5 flex flex-col justify-between h-full relative z-10'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[11px] font-medium text-muted-foreground truncate uppercase tracking-wider'>
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg shrink-0 ${card.iconBg}`}>
                  <Icon className='h-3.5 w-3.5' />
                </div>
              </div>
              <div className='mt-2'>
                {isLoading ? (
                  <div className='h-6 w-16 bg-muted/60 rounded animate-pulse' />
                ) : (
                  <div className='text-xl font-extrabold tracking-tight text-foreground font-mono'>
                    {card.value}
                  </div>
                )}
                <p className='text-[11px] text-muted-foreground truncate mt-0.5'>
                  {card.subtext}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
