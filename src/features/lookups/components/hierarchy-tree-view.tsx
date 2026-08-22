import * as React from 'react'
import {
  ChevronDown,
  ChevronRight,
  Database,
  Search,
  Plus,
  Edit2,
  Sparkles,
  ShieldCheck,
  Info,
  Maximize2,
  Minimize2,
  Package,
  ShoppingCart,
  Tags,
  Users,
  Layers,
  Filter,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  useToggleLookupValue,
} from '../hooks/use-lookups'
import { useLookupsContext } from './provider'
import type {
  LookupDomainCategory,
  LookupTypeTreeNode,
  TreeLookupValueNode,
} from '../data/schema'

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  inventory: Package,
  sales: ShoppingCart,
  pricing: Tags,
  crm: Users,
  general: Layers,
}

interface HierarchyTreeViewProps {
  domains: LookupDomainCategory[]
  types?: LookupTypeTreeNode[]
  isLoading?: boolean
}

export function HierarchyTreeView({
  domains,
  isLoading,
}: HierarchyTreeViewProps) {
  const {
    setSelectedType,
    setIsCreateOpen,
    setParentValueForCreate,
    setSelectedInspectorNode,
    setIsInspectorOpen,
    searchQuery,
    setSearchQuery,
    domainFilter,
    setDomainFilter,
  } = useLookupsContext()

  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
    new Set(['domain_inventory', 'domain_sales', 'domain_pricing', 'domain_crm', 'domain_general'])
  )
  const [scopeFilter, setScopeFilter] = React.useState<'all' | 'custom' | 'system'>('all')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all')

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const all = new Set<string>()
    domains.forEach((d) => {
      all.add(`domain_${d.id}`)
      d.types.forEach((t) => {
        all.add(`type_${t.id}`)
        const addValues = (nodes: TreeLookupValueNode[]) => {
          nodes.forEach((n) => {
            all.add(`val_${n.id}`)
            if (n.children?.length) addValues(n.children)
          })
        }
        addValues(t.values_tree || [])
      })
    })
    setExpandedNodes(all)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  // Filter types based on domain, search, scope, status
  const filteredDomains = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return domains
      .filter((d) => (domainFilter === 'all' ? true : d.id === domainFilter))
      .map((domain) => {
        const filteredTypes = domain.types
          .map((type) => {
            // Filter tree values
            const filterValueNodes = (
              nodes: TreeLookupValueNode[]
            ): TreeLookupValueNode[] => {
              return nodes
                .map((node) => {
                  const matchingChildren = filterValueNodes(node.children || [])

                  let matchesScope = true
                  if (scopeFilter === 'custom') matchesScope = node.is_tenant_custom
                  if (scopeFilter === 'system') matchesScope = node.is_system

                  let matchesStatus = true
                  if (statusFilter === 'active') matchesStatus = node.is_active
                  if (statusFilter === 'inactive') matchesStatus = !node.is_active

                  const matchesSearch =
                    !q ||
                    node.name.toLowerCase().includes(q) ||
                    node.code.toLowerCase().includes(q) ||
                    (node.name_ar && node.name_ar.toLowerCase().includes(q)) ||
                    (node.description && node.description.toLowerCase().includes(q))

                  const isIncluded =
                    (matchesSearch && matchesScope && matchesStatus) ||
                    matchingChildren.length > 0

                  if (!isIncluded) return null

                  return {
                    ...node,
                    children: matchingChildren,
                  }
                })
                .filter(Boolean) as TreeLookupValueNode[]
            }

            const filteredValues = filterValueNodes(type.values_tree || [])

            const matchesTypeSearch =
              !q ||
              type.name.toLowerCase().includes(q) ||
              type.code.toLowerCase().includes(q) ||
              (type.description && type.description.toLowerCase().includes(q))

            let matchesScope = true
            if (scopeFilter === 'custom') matchesScope = !type.is_system || type.custom_count > 0
            if (scopeFilter === 'system') matchesScope = type.is_system

            const hasValues = filteredValues.length > 0
            const isTypeVisible = (matchesTypeSearch && matchesScope) || hasValues

            if (!isTypeVisible) return null

            return {
              ...type,
              values_tree: filteredValues,
            }
          })
          .filter(Boolean) as LookupTypeTreeNode[]

        return {
          ...domain,
          types: filteredTypes,
        }
      })
      .filter((d) => d.types.length > 0)
  }, [domains, searchQuery, domainFilter, scopeFilter, statusFilter])

  // Auto-expand branches when searching
  React.useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const toExpand = new Set<string>()
      filteredDomains.forEach((d) => {
        toExpand.add(`domain_${d.id}`)
        d.types.forEach((t) => {
          toExpand.add(`type_${t.id}`)
        })
      })
      setExpandedNodes(toExpand)
    }
  }, [searchQuery, filteredDomains])

  return (
    <div className='flex flex-col h-full rounded-xl border bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs'>
      {/* Search & Filter Toolbar */}
      <div className='p-3.5 border-b bg-muted/20 space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2.5'>
          {/* Search Input */}
          <div className='relative flex-1 min-w-[240px] max-w-md'>
            <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              placeholder='Search catalogs, options, or codes in hierarchy...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8 h-8 text-xs bg-background'
            />
          </div>

          {/* Quick Domain Filters */}
          <div className='flex items-center gap-1.5 overflow-x-auto'>
            <Button
              variant={domainFilter === 'all' ? 'secondary' : 'ghost'}
              size='sm'
              className='h-7 text-xs px-2.5 font-medium'
              onClick={() => setDomainFilter('all')}
            >
              All Domains
            </Button>
            {domains.map((d) => {
              const Icon = DOMAIN_ICONS[d.id] || Layers
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

          {/* Expand / Collapse Controls */}
          <div className='flex items-center gap-1.5 ms-auto'>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs px-2 gap-1'
              onClick={expandAll}
              title='Expand All Branches'
            >
              <Maximize2 className='h-3 w-3' />
              <span className='hidden sm:inline'>Expand All</span>
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs px-2 gap-1'
              onClick={collapseAll}
              title='Collapse All Branches'
            >
              <Minimize2 className='h-3 w-3' />
              <span className='hidden sm:inline'>Collapse</span>
            </Button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-muted/30'>
          <div className='flex items-center gap-2'>
            <span className='text-[11px] font-medium text-foreground flex items-center gap-1'>
              <Filter className='h-3 w-3' /> Scope:
            </span>
            <div className='inline-flex items-center rounded-md border bg-background p-0.5'>
              <button
                type='button'
                onClick={() => setScopeFilter('all')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  scopeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>
              <button
                type='button'
                onClick={() => setScopeFilter('custom')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  scopeFilter === 'custom' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Custom Tenant
              </button>
              <button
                type='button'
                onClick={() => setScopeFilter('system')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  scopeFilter === 'system' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                System Master
              </button>
            </div>

            <span className='text-muted-foreground/30'>|</span>

            <span className='text-[11px] font-medium text-foreground'>Status:</span>
            <div className='inline-flex items-center rounded-md border bg-background p-0.5'>
              <button
                type='button'
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>
              <button
                type='button'
                onClick={() => setStatusFilter('active')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Active
              </button>
              <button
                type='button'
                onClick={() => setStatusFilter('inactive')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  statusFilter === 'inactive' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className='text-[11px]'>
            Showing <strong className='text-foreground'>{filteredDomains.reduce((acc, d) => acc + d.types.length, 0)}</strong> catalogs
          </div>
        </div>
      </div>

      {/* Tree Content Area */}
      <ScrollArea className='flex-1 p-3'>
        {isLoading ? (
          <div className='py-16 text-center text-xs text-muted-foreground space-y-2'>
            <div className='h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto' />
            <p>Loading hierarchy tree...</p>
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className='py-16 text-center text-xs text-muted-foreground space-y-2'>
            <p className='font-medium text-sm text-foreground'>No matching catalogs found</p>
            <p>Try clearing your search query or adjusting your filters.</p>
          </div>
        ) : (
          <div className='space-y-3 font-sans'>
            {filteredDomains.map((domain) => {
              const domainKey = `domain_${domain.id}`
              const isDomainExpanded = expandedNodes.has(domainKey)
              const DomainIcon = DOMAIN_ICONS[domain.id] || Layers

              return (
                <div
                  key={domain.id}
                  className='rounded-xl border bg-card/40 overflow-hidden shadow-2xs'
                >
                  {/* Domain Header Level */}
                  <div
                    onClick={() => toggleNode(domainKey)}
                    className='w-full flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors text-xs font-semibold'
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <span className='text-muted-foreground'>
                        {isDomainExpanded ? (
                          <ChevronDown className='h-4 w-4' />
                        ) : (
                          <ChevronRight className='h-4 w-4' />
                        )}
                      </span>
                      <div className='p-1.5 rounded-lg bg-primary/10 text-primary'>
                        <DomainIcon className='h-4 w-4' />
                      </div>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-sm text-foreground'>
                            {domain.label}
                          </span>
                          {domain.labelAr && (
                            <span className='text-[11px] text-muted-foreground font-arabic' dir='rtl'>
                              ({domain.labelAr})
                            </span>
                          )}
                        </div>
                        <p className='text-[11px] text-muted-foreground font-normal truncate'>
                          {domain.description}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0'>
                      <Badge variant='outline' className='text-[10px] font-mono'>
                        {domain.types.length} Catalogs
                      </Badge>
                      <Badge variant='secondary' className='text-[10px] font-mono'>
                        {domain.valuesCount} Total Options
                      </Badge>
                    </div>
                  </div>

                  {/* Domain Children (Types) */}
                  {isDomainExpanded && (
                    <div className='p-2 space-y-2 border-t bg-background/50'>
                      {domain.types.map((type) => {
                        const typeKey = `type_${type.id}`
                        const isTypeExpanded = expandedNodes.has(typeKey)

                        return (
                          <div
                            key={type.id}
                            className='rounded-lg border bg-card/60 overflow-hidden ml-2 sm:ml-4'
                          >
                            {/* Type Level Header */}
                            <div className='flex items-center justify-between p-2.5 hover:bg-accent/40 transition-colors group'>
                              <div
                                onClick={() => toggleNode(typeKey)}
                                className='flex items-center gap-2 flex-1 cursor-pointer min-w-0'
                              >
                                <span className='text-muted-foreground'>
                                  {isTypeExpanded ? (
                                    <ChevronDown className='h-3.5 w-3.5' />
                                  ) : (
                                    <ChevronRight className='h-3.5 w-3.5' />
                                  )}
                                </span>
                                <Database className='h-3.5 w-3.5 text-primary shrink-0' />
                                <span className='font-semibold text-xs text-foreground truncate'>
                                  {type.name}
                                </span>
                                <code className='px-1.5 py-0.2 rounded bg-muted font-mono text-[10px] text-muted-foreground shrink-0'>
                                  {type.code}
                                </code>

                                {type.is_system ? (
                                  <ShieldCheck
                                    className='h-3.5 w-3.5 text-blue-500 shrink-0'
                                    title='System Core Catalog'
                                  />
                                ) : (
                                  <Sparkles
                                    className='h-3.5 w-3.5 text-violet-500 shrink-0'
                                    title='Custom Tenant Catalog'
                                  />
                                )}
                              </div>

                              {/* Type Action Buttons */}
                              <div className='flex items-center gap-1.5 shrink-0 opacity-90 group-hover:opacity-100'>
                                <Badge
                                  variant='secondary'
                                  className='text-[10px] font-mono px-1.5 py-0'
                                >
                                  {type.values_count} options
                                </Badge>

                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-6 w-6 text-muted-foreground hover:text-foreground'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedInspectorNode({ type: 'type', data: type })
                                    setIsInspectorOpen(true)
                                  }}
                                  title='Inspect Catalog Details'
                                >
                                  <Info className='h-3 w-3' />
                                </Button>

                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-6 w-6 text-primary hover:bg-primary/10'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedType(type)
                                    setParentValueForCreate(null)
                                    setIsCreateOpen(true)
                                  }}
                                  title='Add Option to Catalog'
                                >
                                  <Plus className='h-3.5 w-3.5' />
                                </Button>
                              </div>
                            </div>

                            {/* Nested Value Tree Nodes */}
                            {isTypeExpanded && (
                              <div className='pl-3 sm:pl-6 pr-2 py-1.5 border-t bg-muted/10 space-y-1 relative'>
                                {/* Tree vertical guide line */}
                                <div className='absolute left-3 sm:left-5 top-2 bottom-2 w-px bg-border/60' />

                                {type.values_tree && type.values_tree.length > 0 ? (
                                  type.values_tree.map((valueNode) => (
                                    <TreeNodeRow
                                      key={valueNode.id}
                                      node={valueNode}
                                      typeNode={type}
                                      expandedNodes={expandedNodes}
                                      toggleNode={toggleNode}
                                    />
                                  ))
                                ) : (
                                  <div className='py-3 pl-4 text-xs text-muted-foreground flex items-center justify-between'>
                                    <span>No options configured in this catalog yet.</span>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className='h-6 text-[10px] gap-1'
                                      onClick={() => {
                                        setSelectedType(type)
                                        setParentValueForCreate(null)
                                        setIsCreateOpen(true)
                                      }}
                                    >
                                      <Plus className='h-3 w-3' /> Add First Option
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface TreeNodeRowProps {
  node: TreeLookupValueNode
  typeNode: LookupTypeTreeNode
  expandedNodes: Set<string>
  toggleNode: (id: string) => void
}

function TreeNodeRow({
  node,
  typeNode,
  expandedNodes,
  toggleNode,
}: TreeNodeRowProps) {
  const {
    setSelectedType,
    setIsCreateOpen,
    setEditingValue,
    setParentValueForCreate,
    setSelectedInspectorNode,
    setIsInspectorOpen,
  } = useLookupsContext()

  const hasChildren = node.children && node.children.length > 0
  const nodeKey = `val_${node.id}`
  const isExpanded = expandedNodes.has(nodeKey)

  const toggleMutation = useToggleLookupValue(typeNode.code)

  return (
    <div className='space-y-1 relative'>
      {/* Node Row */}
      <div
        className={cn(
          'flex items-center justify-between p-1.5 rounded-md hover:bg-accent/60 transition-all text-xs group',
          !node.is_active && 'opacity-60 bg-muted/20'
        )}
      >
        <div className='flex items-center gap-1.5 min-w-0 flex-1'>
          {/* Expander Arrow */}
          {hasChildren ? (
            <button
              type='button'
              onClick={() => toggleNode(nodeKey)}
              className='p-0.5 text-muted-foreground hover:text-foreground rounded'
            >
              {isExpanded ? (
                <ChevronDown className='h-3 w-3' />
              ) : (
                <ChevronRight className='h-3 w-3' />
              )}
            </button>
          ) : (
            <span className='w-4 shrink-0 flex items-center justify-center text-muted-foreground/30'>
              •
            </span>
          )}

          {/* Color Dot or Icon */}
          {node.color ? (
            <span
              className='h-2.5 w-2.5 rounded-full shrink-0 border'
              style={{ backgroundColor: node.color }}
            />
          ) : (
            <span className='h-2 w-2 rounded-full shrink-0 bg-muted border' />
          )}

          {/* Value Name & Arabic */}
          <span
            onClick={() => {
              setSelectedInspectorNode({ type: 'value', data: node })
              setIsInspectorOpen(true)
            }}
            className='font-medium text-foreground truncate cursor-pointer hover:underline'
          >
            {node.name}
          </span>

          {node.name_ar && (
            <span className='text-[10px] text-muted-foreground/90 font-arabic truncate' dir='rtl'>
              ({node.name_ar})
            </span>
          )}

          {/* Code Badge */}
          <code className='px-1.5 py-0.2 rounded bg-muted font-mono text-[10px] text-muted-foreground shrink-0'>
            {node.code}
          </code>

          {/* Default Badge */}
          {node.is_default && (
            <Badge
              variant='secondary'
              className='text-[9px] py-0 px-1 font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400'
            >
              Default
            </Badge>
          )}

          {/* Scope Badge */}
          {node.is_tenant_custom ? (
            <span className='text-[9px] px-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>
              Custom
            </span>
          ) : (
            <span className='text-[9px] px-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'>
              Preset
            </span>
          )}
        </div>

        {/* Quick Action Toolbar on Hover */}
        <div className='flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'>
          {/* Quick Inspector */}
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground hover:text-foreground'
            onClick={() => {
              setSelectedInspectorNode({ type: 'value', data: node })
              setIsInspectorOpen(true)
            }}
            title='Inspect Details'
          >
            <Info className='h-3 w-3' />
          </Button>

          {/* Quick Add Child */}
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground hover:text-primary'
            onClick={() => {
              setSelectedType(typeNode)
              setParentValueForCreate(node.id)
              setIsCreateOpen(true)
            }}
            title='Add Sub-Option / Child'
          >
            <Plus className='h-3 w-3' />
          </Button>

          {/* Quick Edit */}
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6 text-muted-foreground hover:text-foreground'
            onClick={() => setEditingValue(node)}
            title='Edit Option'
          >
            <Edit2 className='h-3 w-3' />
          </Button>

          {/* Quick Status Toggle */}
          <button
            type='button'
            onClick={() => toggleMutation.mutate(node.id)}
            disabled={toggleMutation.isPending}
            className='p-1 text-muted-foreground hover:text-foreground rounded'
            title={node.is_active ? 'Click to Deactivate' : 'Click to Activate'}
          >
            {node.is_active ? (
              <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' />
            ) : (
              <XCircle className='h-3.5 w-3.5 text-rose-500' />
            )}
          </button>
        </div>
      </div>

      {/* Recursive Children Rows */}
      {hasChildren && isExpanded && (
        <div className='pl-4 sm:pl-6 space-y-1 relative'>
          <div className='absolute left-2.5 top-0 bottom-2 w-px bg-border/40' />
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              typeNode={typeNode}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
