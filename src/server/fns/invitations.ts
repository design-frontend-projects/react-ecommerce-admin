'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/server/supabase-admin'
import { ADMIN_ROLES } from '@/types/user-role.enum'
import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { getPrimaryRoleName } from '@/features/users/data/rbac'
import { requireAuth } from '@/server/utils/auth'
import { resolveTenantId } from '@/server/utils/tenant'
import type {
  InviteUserInput,
  InviteUserResult,
} from '@/features/users/data/types'
import { updateUserRoles } from './rbac'

export const inviteUser = createServerFn({ method: 'POST' })
  .validator((data: InviteUserInput) => data)
  .handler(async ({ data: input }): Promise<InviteUserResult> => {
    if (!input.sessionToken) {
      throw new Error('Unauthorized: Missing session token')
    }

    // The inviter is always the authenticated caller — never trusted from the
    // payload.
    const caller = await requireAuth(input.sessionToken, 'users.manage')
    const inviterAuthUserId = caller.userId

    const inviter = await prisma.tenant_users.findUnique({
      where: { auth_user_id: inviterAuthUserId },
    })

    if (!inviter) {
      throw new Error('Inviter tenant profile was not found')
    }

    const email = input.email.trim().toLowerCase()

    // Resolve one or more roles: prefer the multi-role `roleIds`, else fall back to the
    // single `roleId`/`roleName`.
    const roles = (
      input.roleIds && input.roleIds.length > 0
        ? await prisma.roles.findMany({ where: { id: { in: input.roleIds } } })
        : [
            (input.roleId
              ? await prisma.roles.findUnique({ where: { id: input.roleId } })
              : null) ??
              (input.roleName
                ? await prisma.roles.findUnique({
                    where: { name: input.roleName.trim().toLowerCase() },
                  })
                : null),
          ].filter(Boolean)
    ) as Array<{ id: string; name: string }>

    if (roles.length === 0) {
      throw new Error('Selected role was not found')
    }

    const roleNames = roles.map((role) => role.name)
    const roleIds = roles.map((role) => role.id)
    const primaryRole = getPrimaryRoleName(roleNames)
    const isOwnerRole = roleNames.some((name) =>
      ADMIN_ROLES.includes(name.toLowerCase() as any)
    )

    const existingUser = await prisma.tenant_users.findUnique({
      where: { email },
    })

    if (existingUser) {
      await prisma.tenant_users.update({
        where: { id: existingUser.id },
        data: {
          default_role: primaryRole,
          parent_tenant_id: inviter.parent_tenant_id,
          updated_at: new Date(),
        },
      })

      // Sync role to profiles table for role resolution
      await prisma.profiles.updateMany({
        where: { auth_user_id: existingUser.auth_user_id },
        data: {
          role: primaryRole,
          ...(input.branchId ? { branch_id: input.branchId } : {}),
          updated_at: new Date(),
        },
      })

      await updateUserRoles(existingUser.id, roleIds, inviterAuthUserId)

      return {
        success: true,
        invitationId: existingUser.auth_user_id.startsWith('pending_')
          ? existingUser.auth_user_id.replace('pending_', '')
          : null,
        tenantUserId: existingUser.id,
        mode: existingUser.auth_user_id.startsWith('pending_')
          ? 'pending-existing'
          : 'updated',
        message: existingUser.auth_user_id.startsWith('pending_')
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
          role: primaryRole,
          roles: roleNames,
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
        auth_user_id: pendingClerkUserId,
        email: input.email.trim().toLowerCase(),
        first_name: null,
        last_name: null,
        is_active: true,
        default_role: primaryRole,
        is_restuarant_user: true,
        modules: ['inventory', 'restaurant'],
        parent_tenant_id: inviter.parent_tenant_id,
        onboarding_complete: false,
      },
    })

    await prisma.user_roles.createMany({
      data: roleIds.map((roleId) => ({
        tenant_user_id: tenantUser.id,
        role_id: roleId,
      })),
      skipDuplicates: true,
    })

    // Pre-create the user's profile with the branchId if provided
    await prisma.profiles.create({
      data: {
        auth_user_id: pendingClerkUserId,
        email: input.email.trim().toLowerCase(),
        is_owner: isOwnerRole,
        system_owner: false,
        onboarding_complete: false,
        branch_id: input.branchId || null,
        role: primaryRole,
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

export const listPendingInvitations = createServerFn({ method: 'GET' })
  .validator(z.object({ sessionToken: z.string() }))
  .handler(async ({ data: { sessionToken } }) => {
    const caller = await requireAuth(sessionToken, [
      'users.view',
      'users.manage',
    ])
    const tenantId = await resolveTenantId(caller.userId)

    // For Supabase we could list users and find those with no last_sign_in_at.
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers()

    if (error) return []

    const pendingUsers = users.filter((u) => !u.last_sign_in_at && u.invited_at)

    // Only surface invitations that belong to the caller's tenant.
    const tenantMembers = (await prisma.tenant_users.findMany({
      where: tenantId
        ? { parent_tenant_id: tenantId }
        : { auth_user_id: caller.userId },
      select: { auth_user_id: true },
    })) as Array<{ auth_user_id: string }>
    const tenantAuthUserIds = new Set(
      tenantMembers.map((member) => member.auth_user_id)
    )

    return pendingUsers
      .filter((invitation) => tenantAuthUserIds.has(invitation.id))
      .map((invitation) => ({
        id: invitation.id,
        emailAddress: invitation.email ?? 'unknown',
        status: 'pending',
        role:
          (invitation.user_metadata as { role?: string })?.role ?? 'unknown',
        createdAt: new Date(invitation.created_at).toISOString(),
      }))
  })

export const revokeInvitation = createServerFn({ method: 'POST' })
  .validator(
    z.object({ invitationId: z.string(), sessionToken: z.string() })
  )
  .handler(async ({ data: { invitationId, sessionToken } }) => {
    const caller = await requireAuth(sessionToken, 'users.manage')
    const tenantId = await resolveTenantId(caller.userId)

    // The invitation must belong to a pending user inside the caller's tenant.
    const pendingUser = (await prisma.tenant_users.findUnique({
      where: { auth_user_id: invitationId },
      select: { parent_tenant_id: true },
    })) as { parent_tenant_id: string | null } | null

    if (!pendingUser || !tenantId || pendingUser.parent_tenant_id !== tenantId) {
      throw new Error('Forbidden: Invitation not found in your tenant')
    }

    // Delete the unconfirmed user
    await supabaseAdmin.auth.admin.deleteUser(invitationId)

    // Cleanup
    await prisma.tenant_users.deleteMany({
      where: { auth_user_id: invitationId },
    })
  })
