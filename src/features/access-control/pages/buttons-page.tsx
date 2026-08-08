import { useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { PencilIcon, SquarePlusIcon, Trash2Icon } from 'lucide-react'
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
import { ButtonFormDialog } from '../components/button-form-dialog'
import type { PermissionButton } from '../data/schema'
import { useButtons, useDeleteButton } from '../hooks/use-buttons'

export function ButtonsPage() {
  const { t } = useTranslation()
  const buttonsQuery = useButtons()
  const deleteMutation = useDeleteButton()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PermissionButton | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PermissionButton | null>(
    null
  )

  const buttons = buttonsQuery.data ?? []

  const openCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const openEdit = (button: PermissionButton) => {
    setEditTarget(button)
    setFormOpen(true)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (buttonsQuery.isUnauthorized) {
    return (
      <Main className='flex flex-1 items-center justify-center'>
        <Alert className='max-w-xl'>
          <AlertTitle>{t('accessControl.buttonsPage.restrictedTitle')}</AlertTitle>
          <AlertDescription>
            {t('accessControl.buttonsPage.restrictedDesc')}
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
              {t('accessControl.buttonsPage.category')}
            </p>
            <h1 className='truncate text-lg font-semibold'>
              {t('accessControl.buttonsPage.title')}
            </h1>
          </div>
          <Can permission='buttons.manage'>
            <Button type='button' onClick={openCreate}>
              <SquarePlusIcon className='mr-2 size-4' />
              {t('accessControl.buttonsPage.createButton')}
            </Button>
          </Can>
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-6'>
        <p className='max-w-3xl text-sm text-muted-foreground'>
          <Trans
            i18nKey='accessControl.buttonsPage.subtitle'
            components={{ code: <code /> }}
          />
        </p>

        {buttonsQuery.isLoading && (
          <div className='flex flex-col gap-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        )}

        {buttonsQuery.isError && (
          <Alert variant='destructive'>
            <AlertTitle>{t('accessControl.buttonsPage.failedLoadTitle')}</AlertTitle>
            <AlertDescription>
              {buttonsQuery.error instanceof Error
                ? buttonsQuery.error.message
                : t('accessControl.buttonsPage.pleaseTryAgain')}
            </AlertDescription>
          </Alert>
        )}

        {!buttonsQuery.isLoading && !buttonsQuery.isError && (
          <section className='rounded-2xl border border-border/70 bg-card/60 px-5 py-4'>
            {buttons.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                {t('accessControl.buttonsPage.noButtons')}
              </p>
            ) : (
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accessControl.buttonsPage.table.code')}</TableHead>
                      <TableHead>{t('accessControl.buttonsPage.table.name')}</TableHead>
                      <TableHead>{t('accessControl.buttonsPage.table.description')}</TableHead>
                      <TableHead>{t('accessControl.buttonsPage.table.type')}</TableHead>
                      <TableHead className='text-right'>{t('accessControl.buttonsPage.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buttons.map((button) => (
                      <TableRow key={button.id}>
                        <TableCell className='font-mono text-xs'>
                          {button.code}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {button.name}
                        </TableCell>
                        <TableCell className='max-w-96 text-sm text-muted-foreground'>
                          {button.description ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={button.isSystem ? 'outline' : 'secondary'}
                          >
                            {button.isSystem ? t('accessControl.buttonsPage.table.system') : t('accessControl.buttonsPage.table.custom')}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Can permission='buttons.manage'>
                            <div className='flex justify-end gap-1'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                aria-label={`Edit ${button.name}`}
                                onClick={() => openEdit(button)}
                              >
                                <PencilIcon className='size-4' />
                              </Button>
                              {!button.isSystem && (
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  aria-label={`Delete ${button.name}`}
                                  onClick={() => setDeleteTarget(button)}
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
        )}
      </Main>

      <ButtonFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        button={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('accessControl.buttonsPage.deleteDialog.title')}
        desc={
          deleteTarget
            ? t('accessControl.buttonsPage.deleteDialog.desc', { name: deleteTarget.name, code: deleteTarget.code })
            : ''
        }
        cancelBtnText={t('accessControl.buttonsPage.deleteDialog.cancel')}
        confirmText={t('accessControl.buttonsPage.deleteDialog.confirm')}
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={handleDelete}
      />
    </>
  )
}
