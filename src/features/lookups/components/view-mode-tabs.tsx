import {
  GitFork,
  Network,
  Columns2,
  TableProperties,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLookupsContext, type ViewMode } from './provider'

export function ViewModeTabs() {
  const { viewMode, setViewMode } = useLookupsContext()

  const tabs: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    {
      id: 'tree',
      label: 'Tree Hierarchy',
      icon: GitFork,
    },
    {
      id: 'graph',
      label: 'Visual Mindmap',
      icon: Network,
    },
    {
      id: 'split',
      label: 'Catalog & Table',
      icon: Columns2,
    },
    {
      id: 'matrix',
      label: 'Global Matrix',
      icon: TableProperties,
    },
  ]

  return (
    <div className='inline-flex items-center rounded-xl bg-muted/60 p-1 border shadow-2xs'>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = viewMode === tab.id

        return (
          <button
            key={tab.id}
            type='button'
            onClick={() => setViewMode(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              isActive
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
