import { Loader2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { GlobalValuesMatrix } from './components/global-values-matrix'
import { HierarchyTreeView } from './components/hierarchy-tree-view'
import { LookupStatsCards } from './components/lookup-stats-cards'
import { NodeInspectorDrawer } from './components/node-inspector-drawer'
import { LookupsPrimaryButtons } from './components/primary-buttons'
import { LookupsProvider, useLookupsContext } from './components/provider'
import { TypeFormDialog } from './components/type-form-dialog'
import { TypesList } from './components/types-list'
import { ValueFormDialog } from './components/value-form-dialog'
import { ValuesTable } from './components/values-table'
import { ViewModeTabs } from './components/view-mode-tabs'
import { VisualHierarchyGraph } from './components/visual-hierarchy-graph'
import { useLookupTree, useLookupTypes, useLookupValues } from './hooks/use-lookups'

function LookupsContent() {
  const { data: treeData, isLoading: isTreeLoading, error: treeError } = useLookupTree()
  const { data: types, isLoading: isTypesLoading } = useLookupTypes()
  const { viewMode, selectedType } = useLookupsContext()
  const { data: valuesData, isLoading: isValuesLoading } = useLookupValues(
    selectedType?.code,
    true
  )

  const isLoading = isTreeLoading && isTypesLoading

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-5 pb-12'>
        {/* Page Header */}
        <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
          <div>
            <h2 className='bg-linear-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent'>
              Master Lookups &amp; Reference Catalogs
            </h2>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              Configure tenant-specific dropdown options, multi-tier tree hierarchies, and master reference lists.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            <ViewModeTabs />
            <LookupsPrimaryButtons />
          </div>
        </div>

        {/* Top KPI Metrics Bar */}
        <LookupStatsCards stats={treeData?.stats} isLoading={isTreeLoading} />

        {/* View Mode Switching Canvas */}
        {isLoading ? (
          <div className='flex min-h-[420px] flex-1 items-center justify-center rounded-xl border bg-card/40'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : treeError ? (
          <div className='flex flex-1 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-8 text-rose-500 dark:bg-rose-950/20'>
            <p className='font-medium text-sm'>
              Unable to load lookup hierarchy data. Please verify your permissions.
            </p>
          </div>
        ) : (
          <div className='flex-1 min-h-[580px] flex flex-col'>
            {viewMode === 'tree' && (
              <HierarchyTreeView
                domains={treeData?.domains || []}
                types={treeData?.types || []}
                isLoading={isTreeLoading}
              />
            )}

            {viewMode === 'graph' && (
              <VisualHierarchyGraph
                domains={treeData?.domains || []}
                types={treeData?.types || []}
                isLoading={isTreeLoading}
              />
            )}

            {viewMode === 'split' && (
              <div className='grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-[550px]'>
                <div className='md:col-span-4 lg:col-span-3 h-[600px] md:h-auto'>
                  <TypesList types={types ?? []} />
                </div>
                <div className='md:col-span-8 lg:col-span-9 h-[600px] md:h-auto'>
                  <ValuesTable
                    values={valuesData?.values ?? []}
                    isLoading={isValuesLoading}
                  />
                </div>
              </div>
            )}

            {viewMode === 'matrix' && (
              <GlobalValuesMatrix
                types={treeData?.types || []}
                isLoading={isTreeLoading}
              />
            )}
          </div>
        )}
      </Main>

      {/* Dialogs & Drawers */}
      <ValueFormDialog />
      <TypeFormDialog />
      <NodeInspectorDrawer />
    </>
  )
}

export function Lookups() {
  return (
    <LookupsProvider>
      <LookupsContent />
    </LookupsProvider>
  )
}

export * from './components/lookup-select'
export * from './components/hierarchy-tree-view'
export * from './components/visual-hierarchy-graph'
export * from './components/global-values-matrix'
export * from './hooks/use-lookups'
export * from './data/schema'
