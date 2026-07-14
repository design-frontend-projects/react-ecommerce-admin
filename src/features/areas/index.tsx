import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AreasActionDialog } from './components/areas-action-dialog'
import { AreasDeleteDialog } from './components/areas-delete-dialog'
import { AreasPrimaryButtons } from './components/areas-primary-buttons'
import { AreasTable } from './components/areas-table'
import { AreasProvider, useAreasContext } from './context/areas-context'

export default function Areas() {
  return (
    <AreasProvider>
      <AreasContent />
    </AreasProvider>
  )
}

function AreasContent() {
  const { open, setOpen, currentRow, setCurrentRow } = useAreasContext()

  return (
    <>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Areas</h2>
            <p className='text-muted-foreground'>
              Manage regions and delivery zones.
            </p>
          </div>
          <AreasPrimaryButtons />
        </div>

        <AreasTable />

        <AreasActionDialog
          open={open === 'add' || open === 'edit'}
          onOpenChange={(v) => {
            if (!v) {
              setOpen(null)
              setCurrentRow(null)
            }
          }}
          currentRow={currentRow}
        />

        <AreasDeleteDialog
          open={open === 'delete'}
          onOpenChange={(v) => {
            if (!v) {
              setOpen(null)
              setCurrentRow(null)
            }
          }}
          currentRow={currentRow}
        />
      </Main>
    </>
  )
}
