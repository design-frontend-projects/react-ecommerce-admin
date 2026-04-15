import { useState } from 'react'
import { UserList } from '../blocks/user-list'
import { InviteForm } from '../blocks/invite-form'
import { Button } from '@/components/ui/button'
import { RBACGuard } from '../components/rbac-guard'
import { Plus } from 'lucide-react'

export function UserManagementPage() {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <div className="flex items-center space-x-2">
          <RBACGuard resource="users" action="create">
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </RBACGuard>
        </div>
      </div>
      
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <UserList />
      </div>

      <InviteForm open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
