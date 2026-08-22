import * as React from 'react'
import {
  X,
  Copy,
  Check,
  Edit2,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  Layers,
  Database,
  GitBranch,
  Code2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useDeleteLookupValue,
  useToggleLookupValue,
} from '../hooks/use-lookups'
import { useLookupsContext } from './provider'
import type { LookupTypeTreeNode, TreeLookupValueNode } from '../data/schema'

export function NodeInspectorDrawer() {
  const {
    selectedInspectorNode,
    isInspectorOpen,
    setIsInspectorOpen,
    setSelectedType,
    setIsCreateOpen,
    setEditingValue,
    setParentValueForCreate,
  } = useLookupsContext()

  const [copiedField, setCopiedField] = React.useState<string | null>(null)

  const node = selectedInspectorNode?.data
  const nodeType = selectedInspectorNode?.type

  const isValueNode = nodeType === 'value'
  const valNode = isValueNode ? (node as TreeLookupValueNode) : null
  const typeNode = !isValueNode ? (node as LookupTypeTreeNode) : null

  const typeCode = isValueNode ? valNode?.type_code || '' : typeNode?.code || ''

  const toggleMutation = useToggleLookupValue(typeCode)
  const deleteMutation = useDeleteLookupValue(typeCode)

  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success(`Copied ${field} to clipboard`)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (!isInspectorOpen || !node) return null

  return (
    <div className='fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card/95 backdrop-blur-md border-l shadow-2xl flex flex-col transition-transform animate-in slide-in-from-right duration-200'>
      {/* Header */}
      <div className='p-4 border-b flex items-center justify-between bg-muted/30'>
        <div className='flex items-center gap-2 min-w-0'>
          {isValueNode ? (
            <div
              className='h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border'
              style={{
                backgroundColor: valNode?.color ? `${valNode.color}20` : 'rgba(100,100,100,0.1)',
                borderColor: valNode?.color || 'transparent',
              }}
            >
              {valNode?.color ? (
                <span
                  className='h-3 w-3 rounded-full'
                  style={{ backgroundColor: valNode.color }}
                />
              ) : (
                <Layers className='h-4 w-4 text-muted-foreground' />
              )}
            </div>
          ) : (
            <div className='p-1.5 rounded-lg bg-primary/10 text-primary shrink-0'>
              <Database className='h-4 w-4' />
            </div>
          )}

          <div className='min-w-0'>
            <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              {isValueNode ? 'Lookup Option Details' : 'Lookup Catalog Details'}
            </div>
            <h3 className='font-bold text-base truncate text-foreground'>
              {node.name}
            </h3>
          </div>
        </div>

        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-muted-foreground hover:text-foreground'
          onClick={() => setIsInspectorOpen(false)}
        >
          <X className='h-4 w-4' />
        </Button>
      </div>

      {/* Body Content */}
      <ScrollArea className='flex-1 p-4 space-y-4 text-xs'>
        <div className='space-y-4'>
          {/* Status & Scope Badges */}
          <div className='flex flex-wrap items-center gap-2'>
            {node.is_system ? (
              <Badge
                variant='secondary'
                className='bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1'
              >
                <ShieldCheck className='h-3 w-3' /> Global System Preset
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1'
              >
                <Sparkles className='h-3 w-3' /> Tenant Custom
              </Badge>
            )}

            {node.is_active ? (
              <Badge variant='outline' className='border-emerald-500/40 text-emerald-600'>
                Active
              </Badge>
            ) : (
              <Badge variant='outline' className='border-rose-500/40 text-rose-500'>
                Inactive
              </Badge>
            )}

            {isValueNode && valNode?.is_default && (
              <Badge
                variant='secondary'
                className='bg-amber-500/10 text-amber-600 dark:text-amber-400'
              >
                Default Option
              </Badge>
            )}

            {isValueNode && valNode?.depth !== undefined && valNode.depth > 1 && (
              <Badge variant='outline' className='font-mono text-[10px] gap-1'>
                <GitBranch className='h-2.5 w-2.5' /> Tier {valNode.depth}
              </Badge>
            )}
          </div>

          {/* Core Info Box */}
          <div className='rounded-lg border bg-muted/20 p-3 space-y-2.5'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Code Key</span>
              <div className='flex items-center gap-1.5'>
                <code className='bg-background px-2 py-0.5 rounded font-mono font-semibold text-foreground text-[11px] border'>
                  {node.code}
                </code>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 text-muted-foreground'
                  onClick={() => handleCopy(node.code, 'Code')}
                  title='Copy Code'
                >
                  {copiedField === 'Code' ? (
                    <Check className='h-3 w-3 text-emerald-500' />
                  ) : (
                    <Copy className='h-3 w-3' />
                  )}
                </Button>
              </div>
            </div>

            {isValueNode && valNode?.type_code && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Parent Catalog</span>
                <span className='font-mono text-muted-foreground'>
                  {valNode.type_code}
                </span>
              </div>
            )}

            {node.description && (
              <div className='pt-1'>
                <span className='text-muted-foreground block text-[11px] mb-0.5'>
                  Description
                </span>
                <p className='text-foreground text-xs leading-relaxed'>
                  {node.description}
                </p>
              </div>
            )}

            {isValueNode && valNode?.name_ar && (
              <div className='pt-1'>
                <span className='text-muted-foreground block text-[11px] mb-0.5'>
                  Arabic Display Name (الاسم بالعربية)
                </span>
                <div className='text-foreground font-arabic text-sm p-2 rounded bg-background border' dir='rtl'>
                  {valNode.name_ar}
                </div>
              </div>
            )}
          </div>

          {/* Catalog-specific summary if type node */}
          {!isValueNode && typeNode && (
            <div className='rounded-lg border bg-muted/20 p-3 space-y-2'>
              <h4 className='font-semibold text-xs text-foreground'>
                Catalog Statistics
              </h4>
              <div className='grid grid-cols-2 gap-2 text-xs'>
                <div className='p-2 rounded bg-background border'>
                  <div className='text-muted-foreground text-[10px]'>Total Options</div>
                  <div className='text-sm font-bold font-mono'>{typeNode.values_count}</div>
                </div>
                <div className='p-2 rounded bg-background border'>
                  <div className='text-muted-foreground text-[10px]'>Active Options</div>
                  <div className='text-sm font-bold font-mono text-emerald-600'>
                    {typeNode.active_count}
                  </div>
                </div>
                <div className='p-2 rounded bg-background border'>
                  <div className='text-muted-foreground text-[10px]'>Custom Overrides</div>
                  <div className='text-sm font-bold font-mono text-violet-600'>
                    {typeNode.custom_count}
                  </div>
                </div>
                <div className='p-2 rounded bg-background border'>
                  <div className='text-muted-foreground text-[10px]'>System Presets</div>
                  <div className='text-sm font-bold font-mono text-blue-600'>
                    {typeNode.system_count}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata JSON Inspector */}
          {isValueNode && valNode?.metadata && Object.keys(valNode.metadata).length > 0 && (
            <div className='rounded-lg border bg-muted/20 p-3 space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5 font-semibold text-xs'>
                  <Code2 className='h-3.5 w-3.5 text-primary' />
                  <span>Custom Metadata Attributes</span>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 text-muted-foreground'
                  onClick={() =>
                    handleCopy(JSON.stringify(valNode.metadata, null, 2), 'Metadata JSON')
                  }
                  title='Copy JSON'
                >
                  {copiedField === 'Metadata JSON' ? (
                    <Check className='h-3 w-3 text-emerald-500' />
                  ) : (
                    <Copy className='h-3 w-3' />
                  )}
                </Button>
              </div>

              <pre className='p-2.5 rounded bg-background border font-mono text-[11px] text-foreground overflow-x-auto max-h-36'>
                {JSON.stringify(valNode.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* System ID */}
          <div className='flex items-center justify-between text-[11px] text-muted-foreground pt-2'>
            <span>UUID</span>
            <code className='font-mono text-[10px]'>{node.id}</code>
          </div>
        </div>
      </ScrollArea>

      {/* Action Footer */}
      <div className='p-3 border-t bg-muted/40 space-y-2'>
        <div className='flex items-center gap-2'>
          {isValueNode ? (
            <>
              <Button
                variant='outline'
                size='sm'
                className='flex-1 text-xs gap-1.5 h-8'
                onClick={() => {
                  setEditingValue(valNode)
                  setIsInspectorOpen(false)
                }}
              >
                <Edit2 className='h-3.5 w-3.5' /> Edit
              </Button>

              <Button
                variant='outline'
                size='sm'
                className='flex-1 text-xs gap-1.5 h-8'
                onClick={() => {
                  setSelectedType({
                    id: valNode?.lookup_type_id || '',
                    code: valNode?.type_code || '',
                    name: valNode?.type_name || '',
                    is_system: false,
                    is_active: true,
                    sort_order: 0,
                    values_count: 0,
                    custom_count: 0,
                    system_count: 0,
                  })
                  setParentValueForCreate(valNode?.id || null)
                  setIsCreateOpen(true)
                  setIsInspectorOpen(false)
                }}
              >
                <Plus className='h-3.5 w-3.5' /> Add Child Option
              </Button>

              <Button
                variant='secondary'
                size='sm'
                className='text-xs h-8 px-2.5'
                onClick={() => {
                  if (valNode) toggleMutation.mutate(valNode.id)
                }}
                disabled={toggleMutation.isPending}
                title='Toggle Active Status'
              >
                {valNode?.is_active ? (
                  <ToggleRight className='h-4 w-4 text-emerald-600' />
                ) : (
                  <ToggleLeft className='h-4 w-4 text-muted-foreground' />
                )}
              </Button>

              {valNode?.is_tenant_custom && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5'
                  onClick={() => {
                    if (valNode && window.confirm(`Deactivate '${valNode.name}'?`)) {
                      deleteMutation.mutate(valNode.id)
                      setIsInspectorOpen(false)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  title='Deactivate'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                size='sm'
                className='flex-1 text-xs gap-1.5 h-8'
                onClick={() => {
                  if (typeNode) setSelectedType(typeNode)
                  setParentValueForCreate(null)
                  setIsCreateOpen(true)
                  setIsInspectorOpen(false)
                }}
              >
                <Plus className='h-3.5 w-3.5' /> Add Option to Catalog
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
