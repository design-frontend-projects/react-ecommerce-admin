import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Role } from '../data/schema'
import { toast } from 'sonner'
import { RBACGuard } from '../components/rbac-guard'

export function PermissionEditor({ role }: { role: Role }) {
  const [loading, setLoading] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role.permissions?.map(p => `${p.resource}:${p.action}`) || []
  )

  const handleToggle = (resource: string, action: string) => {
    const key = `${resource}:${action}`
    setSelectedPermissions(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Stub: Here you would call a server function to update role permissions
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Permissions updated successfully')
    } catch (e) {
      toast.error('Failed to update permissions')
    } finally {
      setLoading(false)
    }
  }

  const resources = ['users', 'roles', 'inventory', 'orders']
  const actions = ['create', 'read', 'update', 'delete', 'manage']

  return (
    <div className="space-y-4 rounded border p-4 shadow-sm animate-in fade-in duration-500">
      <h3 className="text-lg font-medium">Edit Permissions: <span className="capitalize">{role.name}</span></h3>
      <div className="grid grid-cols-6 gap-4 items-center">
        <div className="font-semibold px-2">Resource</div>
        {actions.map(a => <div key={a} className="font-semibold capitalize text-center">{a}</div>)}
        
        {resources.map(resource => (
          <React.Fragment key={resource}>
            <div className="capitalize px-2 py-2 border-t">{resource}</div>
            {actions.map(action => (
              <div key={`${resource}-${action}`} className="flex justify-center border-t py-2">
                <Checkbox
                  checked={selectedPermissions.includes(`${resource}:${action}`)}
                  onCheckedChange={() => handleToggle(resource, action)}
                  disabled={loading}
                />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      
      <div className="flex justify-end pt-4">
        <RBACGuard resource="roles" action="update">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Permissions'}
          </Button>
        </RBACGuard>
      </div>
    </div>
  )
}
