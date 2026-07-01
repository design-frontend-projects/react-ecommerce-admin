import { supabaseAdmin } from '@/server/supabase-admin'
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { getPrimaryRoleName } from '@/features/users/data/rbac'
import type {
  InviteUserInput,
  InviteUserResult,
} from '@/features/users/data/types'
import { updateUserRoles } from './rbac'

export const inviteUser = createServerFn({ method: 'POST' })
  .validator((data: InviteUserInput) => data)
  .handler(async ({ data: input }): Promise<InviteUserResult> => {
    if (!input.inviterAuthUserId) {
      throw new Error('Inviter context is required')
    }

    const inviter = await prisma.tenant_users.findUnique({
      where: { user_id: input.inviterAuthUserId },
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

      if (input.branchId) {
        await prisma.profiles.updateMany({
          where: { user_id: existingUser.user_id },
          data: { branch_id: input.branchId, updated_at: new Date() },
        })
      }

      await updateUserRoles(existingUser.id, [role.id], input.inviterAuthUserId)

      return {
        success: true,
        invitationId: existingUser.user_id.startsWith('pending_')
          ? existingUser.user_id.replace('pending_', '')
          : null,
        tenantUserId: existingUser.id,
        mode: existingUser.user_id.startsWith('pending_')
          ? 'pending-existing'
          : 'updated',
        message: existingUser.user_id.startsWith('pending_')
          ? 'Pending invitation already exists. The assigned role has been updated.'
          : 'Existing user role has been updated for this tenant.',
      }
    }

    const {
      data: { user: invitation },
      error,
    } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      input.email.trim().toLowerCase(),
      {
        data: {
          role: role.name,
          roles: [role.name],
          onboardingComplete: false,
          invitedViaRbac: true,
          tenantId: inviter.parent_tenant_id,
        },
        redirectTo:
          input.redirectUrl ??
          `${process.env.VITE_APP_URL || 'http://localhost:5177'}/sign-up`,
      }
    )

    if (error || !invitation) {
      throw new Error('Failed to create invitation in Supabase')
    }

    const pendingClerkUserId = invitation.id // Supabase already gives us the user ID immediately
    const tenantUser = await prisma.tenant_users.create({
      data: {
        user_id: pendingClerkUserId,
        email: input.email.trim().toLowerCase(),
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
        auth_user_id: pendingClerkUserId,
      },
    })

    // Pre-create the user's profile with the branchId if provided
    await prisma.profiles.create({
      data: {
        user_id: pendingClerkUserId,
        email: input.email.trim().toLowerCase(),
        is_owner: false,
        system_owner: false,
        onboarding_complete: false,
        branch_id: input.branchId || null,
      },
    })

    return {
      success: true,
      invitationId: invitation.id ?? null,
      tenantUserId: tenantUser.id,
      mode: 'created',
      message: 'Invitation sent successfully.',
    }
  })

export const listPendingInvitations = createServerFn({ method: 'GET' }).handler(
  async () => {
    // For Supabase we could list users and find those with no last_sign_in_at.
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers()

    if (error) return []

    const pendingUsers = users.filter((u) => !u.last_sign_in_at && u.invited_at)

    return pendingUsers.map((invitation) => ({
      id: invitation.id,
      emailAddress: invitation.email ?? 'unknown',
      status: 'pending',
      role: (invitation.user_metadata as { role?: string })?.role ?? 'unknown',
      createdAt: new Date(invitation.created_at).toISOString(),
    }))
  }
)

export const revokeInvitation = createServerFn({ method: 'POST' })
  .validator((invitationId: string) => invitationId)
  .handler(async ({ data: invitationId }) => {
    // Delete the unconfirmed user
    await supabaseAdmin.auth.admin.deleteUser(invitationId)

    // Cleanup
    await prisma.tenant_users.deleteMany({
      where: { user_id: invitationId },
    })
  })
