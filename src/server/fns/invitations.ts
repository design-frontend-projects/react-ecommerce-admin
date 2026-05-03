import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'
import { getPrimaryRoleName } from '@/features/users/data/rbac'
import type { InviteUserInput, InviteUserResult } from '@/features/users/data/types'
import { updateUserRoles } from './rbac'

export async function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  if (!input.inviterAuthUserId) {
    throw new Error('Inviter context is required')
  }

  const inviter = await prisma.tenant_users.findUnique({
    where: { auth_user_id: input.inviterAuthUserId },
  })

  if (!inviter) {
    throw new Error('Inviter tenant profile was not found')
  }

  const email = input.email.trim().toLowerCase()
  const role =
    (input.roleId
      ? await prisma.roles.findUnique({ where: { id: input.roleId } })
      : null) ??
    (input.roleName
      ? await prisma.roles.findUnique({
          where: { name: input.roleName.trim().toLowerCase() },
        })
      : null)

  if (!role) {
    throw new Error('Selected role was not found')
  }

  const existingUser = await prisma.tenant_users.findUnique({
    where: { email },
  })

  if (existingUser) {
    await prisma.tenant_users.update({
      where: { id: existingUser.id },
      data: {
        default_role: role.name,
        parent_tenant_id: inviter.parent_tenant_id,
        updated_at: new Date(),
      },
    })

    await updateUserRoles(existingUser.id, [role.id], input.inviterAuthUserId)

    return {
      success: true,
      invitationId: null,
      tenantUserId: existingUser.id,
      mode: existingUser.auth_user_id ? 'updated' : 'pending-existing',
      message: existingUser.auth_user_id
        ? 'Existing user role has been updated for this tenant.'
        : 'Pending invitation already exists. The assigned role has been updated.',
    }
  }

  const redirectTo =
    input.redirectUrl ??
    `${process.env.VITE_APP_URL || 'http://localhost:5177'}/auth/callback`

  const { data: invitation, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: {
        role: role.name,
        roles: [role.name],
        tenant_id: inviter.parent_tenant_id,
      },
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  const tenantUser = await prisma.tenant_users.create({
    data: {
      auth_user_id: invitation.user?.id ?? null,
      email,
      first_name: null,
      last_name: null,
      is_active: true,
      default_role: getPrimaryRoleName([role.name]),
      is_restuarant_user: true,
      modules: ['inventory', 'restaurant'],
      parent_tenant_id: inviter.parent_tenant_id,
      onboarding_complete: false,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: tenantUser.id,
      role_id: role.id,
      auth_user_id: tenantUser.auth_user_id,
    },
  })

  return {
    success: true,
    invitationId: invitation.user?.id ?? null,
    tenantUserId: tenantUser.id,
    mode: 'created',
    message: 'Invitation sent successfully.',
  }
}

export async function listPendingInvitations() {
  const pendingUsers = await prisma.tenant_users.findMany({
    where: { onboarding_complete: false },
    orderBy: { created_at: 'desc' },
  })

  return pendingUsers.map((user: {
    id: string
    email: string | null
    default_role: string | null
    created_at: Date | null
  }) => ({
    id: user.id,
    emailAddress: user.email ?? '',
    status: 'pending',
    role: user.default_role ?? 'unknown',
    createdAt: user.created_at?.toISOString() ?? new Date().toISOString(),
  }))
}

export async function revokeInvitation(invitationId: string) {
  await prisma.tenant_users.delete({
    where: { id: invitationId },
  })
}
