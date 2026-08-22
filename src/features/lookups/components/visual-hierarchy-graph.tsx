import * as React from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Package,
  ShoppingCart,
  Tags,
  Users,
  Layers,
  Database,
  Plus,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLookupsContext } from './provider'
import type {
  LookupDomainCategory,
  LookupTypeTreeNode,
} from '../data/schema'

const DOMAIN_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; border: string; bg: string }
> = {
  inventory: {
    icon: Package,
    color: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
  },
  sales: {
    icon: ShoppingCart,
    color: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  pricing: {
    icon: Tags,
    color: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  crm: {
    icon: Users,
    color: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
  general: {
    icon: Layers,
    color: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
  },
}

interface VisualHierarchyGraphProps {
  domains: LookupDomainCategory[]
  types: LookupTypeTreeNode[]
  isLoading?: boolean
}

export function VisualHierarchyGraph({
  domains,
  types,
}: VisualHierarchyGraphProps) {
  const {
    setSelectedType,
    setIsCreateOpen,
    setSelectedInspectorNode,
    setIsInspectorOpen,
    domainFilter,
    setDomainFilter,
    searchQuery,
  } = useLookupsContext()

  const [zoomLevel, setZoomLevel] = React.useState(1)

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.6))
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.6))
  const handleResetZoom = () => setZoomLevel(1)

  const filteredDomains = React.useMemo(() => {
    return domains.filter((d) =>
      domainFilter === 'all' ? true : d.id === domainFilter
    )
  }, [domains, domainFilter])

  return (
    <div className='flex flex-col h-full rounded-xl border bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs relative'>
      {/* Controls Floating Toolbar */}
      <div className='p-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2 z-10'>
        <div className='flex items-center gap-1.5 overflow-x-auto'>
          <Button
            variant={domainFilter === 'all' ? 'secondary' : 'ghost'}
            size='sm'
            className='h-7 text-xs px-2.5 font-medium'
            onClick={() => setDomainFilter('all')}
          >
            All Clusters
          </Button>
          {domains.map((d) => {
            const config = DOMAIN_CONFIG[d.id] || DOMAIN_CONFIG.general
            const Icon = config.icon
            return (
              <Button
                key={d.id}
                variant={domainFilter === d.id ? 'secondary' : 'ghost'}
                size='sm'
                className='h-7 text-xs px-2.5 font-medium gap-1'
                onClick={() => setDomainFilter(d.id)}
              >
                <Icon className='h-3 w-3' />
                <span>{d.label.split('&')[0].trim()}</span>
              </Button>
            )
          })}
        </div>

        {/* Zoom Controls */}
        <div className='flex items-center gap-1 ms-auto bg-background rounded-lg border p-0.5 shadow-2xs'>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground'
            onClick={handleZoomOut}
            title='Zoom Out'
          >
            <ZoomOut className='h-3.5 w-3.5' />
          </Button>
          <span className='px-1.5 text-[10px] font-mono text-muted-foreground font-semibold'>
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground'
            onClick={handleZoomIn}
            title='Zoom In'
          >
            <ZoomIn className='h-3.5 w-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground'
            onClick={handleResetZoom}
            title='Reset Zoom'
          >
            <RotateCcw className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      {/* Graph Visual Canvas */}
      <div className='flex-1 overflow-auto p-6 bg-dot-pattern relative'>
        <div
          className='transition-transform duration-150 origin-top-left min-w-[900px] pb-16 space-y-12'
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Master Root Hub Node */}
          <div className='flex flex-col items-center justify-center text-center'>
            <div className='p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center gap-3 border border-primary/40'>
              <div className='p-2 rounded-xl bg-white/20 text-white'>
                <Database className='h-6 w-6' />
              </div>
              <div className='text-left'>
                <h3 className='font-extrabold text-base tracking-tight'>
                  Enterprise Master Lookups
                </h3>
                <p className='text-xs text-primary-foreground/80 font-mono'>
                  {domains.length} Domain Clusters • {types.length} Catalogs
                </p>
              </div>
            </div>

            {/* Connecting line to domains */}
            <div className='w-px h-8 bg-border/80 my-1' />
          </div>

          {/* Domain Clusters Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {filteredDomains.map((domain) => {
              const config = DOMAIN_CONFIG[domain.id] || DOMAIN_CONFIG.general
              const Icon = config.icon

              return (
                <div
                  key={domain.id}
                  className={`rounded-2xl border ${config.border} bg-card/70 backdrop-blur-sm p-4 shadow-sm space-y-4`}
                >
                  {/* Domain Cluster Header */}
                  <div className='flex items-center justify-between border-b pb-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
                        <Icon className='h-5 w-5' />
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <h4 className='font-bold text-sm text-foreground'>
                            {domain.label}
                          </h4>
                          {domain.labelAr && (
                            <span className='text-[10px] text-muted-foreground font-arabic' dir='rtl'>
                              {domain.labelAr}
                            </span>
                          )}
                        </div>
                        <p className='text-[11px] text-muted-foreground'>
                          {domain.description}
                        </p>
                      </div>
                    </div>

                    <Badge variant='outline' className='font-mono text-xs'>
                      {domain.types.length} Catalogs
                    </Badge>
                  </div>

                  {/* Catalogs inside this Domain */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    {domain.types.map((type) => {
                      const isMatchingSearch =
                        searchQuery &&
                        (type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          type.code.toLowerCase().includes(searchQuery.toLowerCase()))

                      return (
                        <Card
                          key={type.id}
                          className={cn(
                            'rounded-xl border hover:border-primary/50 transition-all shadow-2xs group relative overflow-hidden',
                            isMatchingSearch && 'ring-2 ring-primary border-primary'
                          )}
                        >
                          <CardContent className='p-3 space-y-2.5'>
                            {/* Type Header */}
                            <div className='flex items-start justify-between gap-1.5'>
                              <div className='min-w-0'>
                                <div className='flex items-center gap-1.5'>
                                  <span className='font-semibold text-xs text-foreground truncate'>
                                    {type.name}
                                  </span>
                                  {type.is_system ? (
                                    <ShieldCheck
                                      className='h-3.5 w-3.5 text-blue-500 shrink-0'
                                      title='System Master'
                                    />
                                  ) : (
                                    <Sparkles
                                      className='h-3.5 w-3.5 text-violet-500 shrink-0'
                                      title='Tenant Custom'
                                    />
                                  )}
                                </div>
                                <code className='text-[10px] font-mono text-muted-foreground'>
                                  {type.code}
                                </code>
                              </div>

                              <div className='flex items-center gap-1 shrink-0'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-6 w-6 text-muted-foreground hover:text-foreground'
                                  onClick={() => {
                                    setSelectedInspectorNode({
                                      type: 'type',
                                      data: type,
                                    })
                                    setIsInspectorOpen(true)
                                  }}
                                  title='Inspect Details'
                                >
                                  <Info className='h-3 w-3' />
                                </Button>

                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-6 w-6 text-primary hover:bg-primary/10'
                                  onClick={() => {
                                    setSelectedType(type)
                                    setIsCreateOpen(true)
                                  }}
                                  title='Add Option'
                                >
                                  <Plus className='h-3 w-3' />
                                </Button>
                              </div>
                            </div>

                            {/* Values Pills Cloud */}
                            <div className='flex flex-wrap gap-1 pt-1'>
                              {type.values_tree && type.values_tree.length > 0 ? (
                                type.values_tree.slice(0, 6).map((val) => (
                                  <button
                                    key={val.id}
                                    type='button'
                                    onClick={() => {
                                      setSelectedInspectorNode({
                                        type: 'value',
                                        data: val,
                                      })
                                      setIsInspectorOpen(true)
                                    }}
                                    className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-muted/60 hover:bg-accent border text-foreground transition-colors'
                                  >
                                    {val.color && (
                                      <span
                                        className='h-1.5 w-1.5 rounded-full shrink-0'
                                        style={{ backgroundColor: val.color }}
                                      />
                                    )}
                                    <span className='truncate max-w-[90px]'>
                                      {val.name}
                                    </span>
                                    {val.children && val.children.length > 0 && (
                                      <span className='text-[8px] font-mono text-muted-foreground font-bold'>
                                        +{val.children.length}
                                      </span>
                                    )}
                                  </button>
                                ))
                              ) : (
                                <span className='text-[10px] text-muted-foreground italic'>
                                  No options configured
                                </span>
                              )}

                              {type.values_tree && type.values_tree.length > 6 && (
                                <span className='text-[10px] text-muted-foreground font-mono self-center px-1'>
                                  +{type.values_tree.length - 6} more
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
