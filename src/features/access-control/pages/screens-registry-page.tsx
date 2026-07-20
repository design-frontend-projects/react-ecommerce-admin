import { useMemo, useState } from 'react'
import {
  MonitorCogIcon,
  PencilIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Can } from '@/components/rbac/Can'
import { ScreenAccessDialog } from '../components/screen-access-dialog'
import { ScreenFormDialog } from '../components/screen-form-dialog'
import type { ModuleWithScreens, Screen } from '../data/schema'
import { useButtons } from '../hooks/use-buttons'
import { useAccessCatalog, useDeleteScreen, useScreens } from '../hooks/use-screens'

interface EditTarget {
  screen: Screen
  moduleId: string
}

export function ScreensRegistryPage() {
  const screensQuery = useScreens()
  const catalogQuery = useAccessCatalog()
  const buttonsQuery = useButtons()
  const deleteMutation = useDeleteScreen()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [accessTarget, setAccessTarget] = useState<Screen | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Screen | null>(null)

  const modules = useMemo(
    () => screensQuery.data?.modules ?? [],
    [screensQuery.data]
  )
  const moduleOptions = useMemo(
    () => modules.map((module) => ({ id: module.id, name: module.name })),
    [modules]
  )

  const roles = catalogQuery.data?.roles ?? []
  const permissions = catalogQuery.data?.allPermissions ?? []
  const buttons = buttonsQuery.data ?? []

  const openCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const openEdit = (screen: Screen, moduleId: string) => {
    setEditTarget({ screen, moduleId })
    setFormOpen(true)
  }

  const openAccess = (screen: Screen) => {
    setAccessTarget(screen)
    setAccessOpen(true)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (screensQuery.isUnauthorized) {
    return (
      <Main className='flex flex-1 items-center justify-center'>
        <Alert className='max-w-xl'>
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            Your account does not have permission to view the screens registry.
          </AlertDescription>
        </Alert>
      </Main>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex min-w-0 flex-1 items-center justify-between gap-4'>
          <div className='flex min-w-0 flex-col gap-1'>
            <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
              Access control
            </p>
            <h1 className='truncate text-lg font-semibold'>Screens registry</h1>
          </div>
          <Can permission='screens.manage'>
            <Button type='button' onClick={openCreate}>
              <MonitorCogIcon className='mr-2 size-4' />
              Create screen
            </Button>
          </Can>
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <p className='max-w-3xl text-sm text-muted-foreground'>
          Screens drive the database-backed navigation and route guards. Grant
          a screen to roles or permissions, and activate the action buttons
          available on it.
        </p>

        {screensQuery.isLoading && (
          <div className='flex flex-col gap-3'>
            <Skeleton className='h-8 w-64' />
            <Skeleton className='h-40 w-full' />
            <Skeleton className='h-40 w-full' />
          </div>
        )}

        {screensQuery.isError && (
          <Alert variant='destructive'>
            <AlertTitle>Failed to load screens</AlertTitle>
            <AlertDescription>
              {screensQuery.error instanceof Error
                ? screensQuery.error.message
                : 'Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {!screensQuery.isLoading &&
          modules.map((module) => (
            <ModuleSection
              key={module.id}
              module={module}
              onEdit={openEdit}
              onAccess={openAccess}
              onDelete={setDeleteTarget}
            />
          ))}
      </Main>

      <ScreenFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        modules={moduleOptions}
        screen={editTarget?.screen ?? null}
        screenModuleId={editTarget?.moduleId ?? null}
      />

      <ScreenAccessDialog
        open={accessOpen}
        onOpenChange={setAccessOpen}
        screen={accessTarget}
        roles={roles}
        permissions={permissions}
        buttons={buttons}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='Delete screen'
        desc={
          deleteTarget
            ? `This removes "${deleteTarget.name}" (${deleteTarget.code}) from the registry along with its role and permission grants. This cannot be undone.`
            : ''
        }
        cancelBtnText='Cancel'
        confirmText='Delete'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={handleDelete}
      />
    </>
  )
}

interface ModuleSectionProps {
  module: ModuleWithScreens
  onEdit: (screen: Screen, moduleId: string) => void
  onAccess: (screen: Screen) => void
  onDelete: (screen: Screen) => void
}

function ModuleSection({
  module,
  onEdit,
  onAccess,
  onDelete,
}: ModuleSectionProps) {
  return (
    <section className='flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 px-5 py-4'>
      <div className='flex items-center gap-2'>
        <h2 className='text-base font-semibold'>{module.name}</h2>
        <Badge variant='outline'>{module.code}</Badge>
        <Badge variant='secondary'>
          {module.screens.length}{' '}
          {module.screens.length === 1 ? 'screen' : 'screens'}
        </Badge>
      </div>
      {module.screens.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          No screens registered in this module yet.
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead className='text-right'>Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Buttons</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {module.screens.map((screen) => (
                <TableRow key={screen.id}>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{screen.name}</span>
                      {screen.isSystem && (
                        <Badge variant='outline'>System</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {screen.code}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {screen.route}
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground'>
                    {screen.icon ?? '—'}
                  </TableCell>
                  <TableCell className='text-right'>
                    {screen.sortOrder}
                  </TableCell>
                  <TableCell>
                    <Badge variant={screen.isActive ? 'default' : 'secondary'}>
                      {screen.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='flex max-w-56 flex-wrap gap-1'>
                      {screen.buttons.filter((link) => link.isActive).length ===
                      0 ? (
                        <span className='text-xs text-muted-foreground'>—</span>
                      ) : (
                        screen.buttons
                          .filter((link) => link.isActive)
                          .map((link) => (
                            <Badge
                              key={link.buttonId}
                              variant='outline'
                              className='font-mono text-[10px]'
                            >
                              {link.code}
                            </Badge>
                          ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Can permission='screens.manage'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          aria-label={`Edit ${screen.name}`}
                          onClick={() => onEdit(screen, module.id)}
                        >
                          <PencilIcon className='size-4' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          aria-label={`Manage access for ${screen.name}`}
                          onClick={() => onAccess(screen)}
                        >
                          <ShieldCheckIcon className='size-4' />
                        </Button>
                        {!screen.isSystem && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            aria-label={`Delete ${screen.name}`}
                            onClick={() => onDelete(screen)}
                          >
                            <Trash2Icon className='size-4 text-destructive' />
                          </Button>
                        )}
                      </div>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
