'use server'

import { inviteUser as serverInviteUser } from '@/server/fns/invitations'

export async function inviteUser(data: { email: string; roleId: string; roleName: string }) {
  try {
    const result = await serverInviteUser({
      email: data.email,
      roleId: data.roleId,
      roleName: data.roleName,
    })
    return result
  } catch (error) {
    console.error('Failed to invite user', error)
    throw new Error('Failed to invite user')
  }
}
