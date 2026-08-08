import { format } from 'date-fns'
import { type TFunction } from 'i18next'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Edit2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { type Profile, useToggleSystemOwner } from '../queries'

interface ActionCellProps {
  profile: Profile
  onEdit: (profile: Profile) => void
  t: TFunction
}

const ActionCell = ({ profile, onEdit, t }: ActionCellProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuLabel>{t('system.profiles.table.actions')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(profile)}>
          <Edit2 className='mr-2 h-4 w-4' />
          {t('system.profiles.table.editProfile')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const SystemOwnerToggle = ({ profile }: { profile: Profile }) => {
  const toggleMutation = useToggleSystemOwner()

  return (
    <Switch
      checked={profile.system_owner}
      onCheckedChange={(checked) =>
        toggleMutation.mutate({ profileId: profile.id, isActive: checked })
      }
      disabled={toggleMutation.isPending}
    />
  )
}

export const getColumns = (
  onEdit: (profile: Profile) => void,
  t: TFunction
): ColumnDef<Profile>[] => [
  {
    accessorKey: 'full_name',
    header: t('system.profiles.table.user'),
    cell: ({ row }) => {
      const profile = row.original
      return (
        <div className='flex items-center gap-3'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback>
              {profile.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium'>
              {profile.full_name || t('system.profiles.table.noName')}
            </span>
            <span className='text-xs text-muted-foreground'>
              {profile.email}
            </span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'role',
    header: t('system.profiles.table.role'),
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      return (
        <Badge variant='outline' className='capitalize'>
          {role || t('system.profiles.table.defaultRole')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'system_owner',
    header: t('system.profiles.table.systemOwner'),
    cell: ({ row }) => <SystemOwnerToggle profile={row.original} />,
  },
  {
    accessorKey: 'created_at',
    header: t('system.profiles.table.joined'),
    cell: ({ row }) =>
      format(new Date(row.getValue('created_at')), 'MMM d, yyyy'),
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionCell profile={row.original} onEdit={onEdit} t={t} />,
  },
]
