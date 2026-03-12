import { format } from 'date-fns'
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
}

const ActionCell = ({ profile, onEdit }: ActionCellProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(profile)}>
          <Edit2 className='mr-2 h-4 w-4' />
          Edit Profile
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
  onEdit: (profile: Profile) => void
): ColumnDef<Profile>[] => [
  {
    accessorKey: 'full_name',
    header: 'User',
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
              {profile.full_name || 'No Name'}
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
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      return (
        <Badge variant='outline' className='capitalize'>
          {role || 'User'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'system_owner',
    header: 'System Owner',
    cell: ({ row }) => <SystemOwnerToggle profile={row.original} />,
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) =>
      format(new Date(row.getValue('created_at')), 'MMM d, yyyy'),
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionCell profile={row.original} onEdit={onEdit} />,
  },
]
