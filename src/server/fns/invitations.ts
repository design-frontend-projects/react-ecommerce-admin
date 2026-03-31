import { clerkBackend } from '@/server/clerk'
import prisma from '@/lib/prisma'

export interface InviteUserInput {
  email: string
  roleId: string
  roleName: string
  desc?: string
}

export interface InviteUserResult {
  success: boolean
  clerkInvitationId: string
  tenantUserId: string
}

/**
 * Invites a user via Clerk Backend API and creates a tenant_users record.
 *
 * 1. Creates a Clerk invitation with role metadata
 * 2. Creates a tenant_users record in the database
 * 3. Creates an employee_roles assignment
 */
export async function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  // 1. Create Clerk invitation with public metadata
  const invitation = await clerkBackend.invitations.createInvitation({
    emailAddress: input.email,
    publicMetadata: {
      role: input.roleName,
      onboardingComplete: false,
    },
    redirectUrl: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/sign-up`,
  })

  // 2. Create tenant_users record
  const tenantUser = await prisma.tenant_users.create({
    data: {
      clerk_user_id: `pending_${invitation.id}`,
      email: input.email,
      first_name: null,
      last_name: null,
      is_active: true,
      default_role: input.roleName,
      is_restuarant_user: true,
      modules: ['inventory', 'restaurant'],
    },
  })

  // 3. Assign role via employee_roles
  await prisma.employee_roles.create({
    data: {
      clerk_user_id: `pending_${invitation.id}`,
      role_id: input.roleId,
    },
  })

  return {
    success: true,
    clerkInvitationId: invitation.id,
    tenantUserId: tenantUser.id,
  }
}

/**
 * Lists all pending invitations from Clerk.
 */
export async function listPendingInvitations() {
  const invitations = await clerkBackend.invitations.getInvitationList({
    status: ['pending'],
  })

  return invitations.data.map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    status: inv.status,
    role: (inv.publicMetadata as { role?: string })?.role ?? 'unknown',
    createdAt: new Date(inv.createdAt).toISOString(),
  }))
}

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  await clerkBackend.invitations.revokeInvitation(invitationId)
}
