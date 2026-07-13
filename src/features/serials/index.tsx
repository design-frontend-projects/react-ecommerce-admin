import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { SerialsToolbar } from './components/toolbar'
import { SerialsTable } from './components/table'
import { SerialTrailDialog } from './components/trail-dialog'
import { useSerials } from './hooks/use-serials'
import type { SerialListItem, SerialStatus } from './data/schema'

const ALL = 'all'

export function Serials() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [trailSerial, setTrailSerial] = useState<SerialListItem | null>(null)
  const [trailOpen, setTrailOpen] = useState(false)

  const { data: serials, isLoading, error } = useSerials({
    search: search || undefined,
    status: status === ALL ? undefined : (status as SerialStatus),
  })

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
              Serial Numbers
            </h2>
            <p className='text-muted-foreground'>
              Unit-level tracking for serialized stock, with the full movement
              trail of each serial.
            </p>
          </div>
        </div>

        <SerialsToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
        />

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>Error loading serial numbers.</p>
          </div>
        ) : (
          <SerialsTable
            data={serials ?? []}
            onTrail={(row) => {
              setTrailSerial(row)
              setTrailOpen(true)
            }}
          />
        )}
      </Main>

      <SerialTrailDialog
        open={trailOpen}
        onOpenChange={setTrailOpen}
        serial={trailSerial}
      />
    </>
  )
}
