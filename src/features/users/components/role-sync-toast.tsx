import { useEffect, useRef } from 'react'
import { useRBACStore } from '../data/store'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import React from 'react'

export function RoleSyncToast() {
  const roles = useRBACStore((state) => state.roles)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    
    // Show a toast that roles has been updated
    toast('Access Permissions Updated', {
      description: 'Your user roles and permissions have been updated via realtime sync.',
      icon: <ShieldCheck className="w-4 h-4 text-green-500" />
    })
  }, [roles])

  return null
}
