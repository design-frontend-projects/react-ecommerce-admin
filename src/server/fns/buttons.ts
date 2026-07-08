import prisma from '@/lib/prisma'
import { ensureAccessControlSeeded } from './access-control-seed'

const BUTTON_CODE_PATTERN = /^[a-z0-9_]+$/

export interface ButtonDto {
  id: string
  code: string
  name: string
  description: string | null
  isSystem: boolean
}

export interface CreateButtonInput {
  code: string
  name: string
  description?: string | null
}

export interface UpdateButtonInput {
  code?: string
  name?: string
  description?: string | null
}

export async function getButtons(): Promise<ButtonDto[]> {
  await ensureAccessControlSeeded()
  const buttons = (await prisma.permission_buttons.findMany({
    orderBy: { code: 'asc' },
  })) as Array<{
    id: string
    code: string
    name: string
    description: string | null
    is_system: boolean
  }>
  return buttons.map((button) => ({
    id: button.id,
    code: button.code,
    name: button.name,
    description: button.description,
    isSystem: button.is_system,
  }))
}

export async function createButton(input: CreateButtonInput) {
  const code = input.code.trim().toLowerCase()
  if (!BUTTON_CODE_PATTERN.test(code)) {
    throw new Error('Button code must be snake_case with no dots.')
  }
  const clash = await prisma.permission_buttons.findUnique({ where: { code } })
  if (clash) throw new Error(`A button with code "${code}" already exists.`)

  return prisma.permission_buttons.create({
    data: {
      code,
      name: input.name.trim(),
      description: input.description ?? null,
      is_system: false,
    },
  })
}

export async function updateButton(id: string, input: UpdateButtonInput) {
  const button = (await prisma.permission_buttons.findUnique({
    where: { id },
  })) as { id: string; is_system: boolean } | null
  if (!button) throw new Error('Button not found.')

  const data: Record<string, unknown> = { updated_at: new Date() }
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.description !== undefined) data.description = input.description
  // System buttons: code is locked.
  if (!button.is_system && input.code !== undefined) {
    const code = input.code.trim().toLowerCase()
    if (!BUTTON_CODE_PATTERN.test(code)) {
      throw new Error('Button code must be snake_case with no dots.')
    }
    data.code = code
  }

  return prisma.permission_buttons.update({ where: { id }, data })
}

export async function deleteButton(id: string) {
  const button = (await prisma.permission_buttons.findUnique({
    where: { id },
  })) as { is_system: boolean } | null
  if (!button) throw new Error('Button not found.')
  if (button.is_system) throw new Error('System buttons cannot be deleted.')

  await prisma.permission_buttons.delete({ where: { id } })
  return { success: true }
}

/**
 * Replace the active button set on a screen. For each requested button we upsert the
 * generated `<screen.code>.<button.code>` permission and (re)activate its screen_buttons
 * row; buttons omitted from the list are deactivated (their permission row is retained so
 * grants become inert but nothing is orphaned). Runs in a single transaction.
 */
export async function setScreenButtons(screenId: string, buttonIds: string[]) {
  const screen = (await prisma.app_screens.findUnique({
    where: { id: screenId },
    select: { id: true, code: true },
  })) as { id: string; code: string } | null
  if (!screen) throw new Error('Screen not found.')

  const buttons = (await prisma.permission_buttons.findMany({
    where: { id: { in: buttonIds } },
    select: { id: true, code: true },
  })) as Array<{ id: string; code: string }>

  const existing = (await prisma.screen_buttons.findMany({
    where: { screen_id: screenId },
    select: { button_id: true },
  })) as Array<{ button_id: string }>

  await prisma.$transaction(async (tx: typeof prisma) => {
    for (const button of buttons) {
      const permissionName = `${screen.code}.${button.code}`
      const permission = await tx.permissions.upsert({
        where: { name: permissionName },
        update: { resource: screen.code, action: button.code, updated_at: new Date() },
        create: {
          name: permissionName,
          description: `${button.code} on the ${screen.code} screen`,
          resource: screen.code,
          action: button.code,
        },
      })
      await tx.screen_buttons.upsert({
        where: { screen_id_button_id: { screen_id: screenId, button_id: button.id } },
        update: { permission_id: permission.id, is_active: true, updated_at: new Date() },
        create: { screen_id: screenId, button_id: button.id, permission_id: permission.id },
      })
    }

    const keep = new Set(buttonIds)
    const toDeactivate = existing
      .filter((row) => !keep.has(row.button_id))
      .map((row) => row.button_id)
    if (toDeactivate.length > 0) {
      await tx.screen_buttons.updateMany({
        where: { screen_id: screenId, button_id: { in: toDeactivate } },
        data: { is_active: false, updated_at: new Date() },
      })
    }
  })

  return { success: true }
}
