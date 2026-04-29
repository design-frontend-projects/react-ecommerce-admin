import prisma from '@/lib/prisma'
import { clerkBackend } from '@/server/clerk'
import { getPrimaryRoleName } from '@/features/users/data/rbac'
import type { InviteUserInput, InviteUserResult } from '@/features/users/data/types'
import { updateUserRoles } from './rbac'

export async function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  if (!input.inviterClerkUserId) {
    throw new Error('Inviter context is required')
  }

  const inviter = await prisma.tenant_users.findUnique({
    where: { clerk_user_id: input.inviterClerkUserId },
  })

  if (!inviter) {
    throw new Error('Inviter tenant profile was not found')
  }

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
    where: { email: input.email.trim().toLowerCase() },
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

    await updateUserRoles(existingUser.id, [role.id], input.inviterClerkUserId)

    return {
      success: true,
      clerkInvitationId: existingUser.clerk_user_id.startsWith('pending_')
        ? existingUser.clerk_user_id.replace('pending_', '')
        : null,
      tenantUserId: existingUser.id,
      mode: existingUser.clerk_user_id.startsWith('pending_') ? 'pending-existing' : 'updated',
      message: existingUser.clerk_user_id.startsWith('pending_')
        ? 'Pending invitation already exists. The assigned role has been updated.'
        : 'Existing user role has been updated for this tenant.',
    }
  }

  const invitation = await clerkBackend.invitations.createInvitation({
    emailAddress: input.email.trim().toLowerCase(),
    publicMetadata: {
      role: role.name,
      roles: [role.name],
      onboardingComplete: false,
      invitedViaRbac: true,
      tenantId: inviter.parent_tenant_id,
    },
    redirectUrl:
      input.redirectUrl ??
      `${process.env.VITE_APP_URL || 'http://localhost:5177'}/sign-up`,
  })

  const pendingClerkUserId = `pending_${invitation.id}`
  const tenantUser = await prisma.tenant_users.create({
    data: {
      clerk_user_id: pendingClerkUserId,
      email: input.email.trim().toLowerCase(),
      first_name: null,
      last_name: null,
      is_active: true,
      default_role: getPrimaryRoleName([role.name]),
      is_restuarant_user: true,
      modules: ['inventory', 'restaurant'],
      parent_tenant_id: inviter.parent_tenant_id,
    },
  })

  await prisma.user_roles.create({
    data: {
      user_id: tenantUser.id,
      role_id: role.id,
      clerk_user_id: pendingClerkUserId,
    },
  })

  return {
    success: true,
    clerkInvitationId: invitation.id,
    tenantUserId: tenantUser.id,
    mode: 'created',
    message: 'Invitation sent successfully.',
  }
}

export async function listPendingInvitations() {
  const invitations = await clerkBackend.invitations.getInvitationList({
    status: 'pending',
  })

  return invitations.data.map((invitation) => ({
    id: invitation.id,
    emailAddress: invitation.emailAddress,
    status: invitation.status,
    role: (invitation.publicMetadata as { role?: string })?.role ?? 'unknown',
    createdAt: new Date(invitation.createdAt).toISOString(),
  }))
}

export async function revokeInvitation(invitationId: string) {
  await clerkBackend.invitations.revokeInvitation(invitationId)
}
