import { Loader2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LookupsPrimaryButtons } from './components/primary-buttons'
import { LookupsProvider, useLookupsContext } from './components/provider'
import { TypesList } from './components/types-list'
import { ValueFormDialog } from './components/value-form-dialog'
import { ValuesTable } from './components/values-table'
import { useLookupTypes, useLookupValues } from './hooks/use-lookups'

function LookupsContent() {
  const { data: types, isLoading: isTypesLoading, error: typesError } = useLookupTypes()
  const { selectedType } = useLookupsContext()
  const { data: valuesData, isLoading: isValuesLoading } = useLookupValues(
    selectedType?.code,
    true
  )

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

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              Master Lookups
            </h2>
            <p className='text-muted-foreground'>
              Configure tenant-specific dropdown options and master reference catalogs.
            </p>
          </div>
          <LookupsPrimaryButtons />
        </div>

        {isTypesLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : typesError ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500 dark:bg-rose-950/20'>
            <p className='font-medium'>Error loading lookup catalogs.</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-[500px]'>
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
      </Main>

      <ValueFormDialog />
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
export * from './hooks/use-lookups'
export * from './data/schema'
