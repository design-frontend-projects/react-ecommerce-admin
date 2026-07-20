import { z } from 'zod'

/**
 * Zod contracts for the access-control admin surface (screens registry +
 * permission buttons). Mirrors the server DTOs in `src/server/fns/screens.ts`
 * and `src/server/fns/buttons.ts` plus the `/api/rbac/screens*` and
 * `/api/rbac/buttons` request shapes.
 */

const SNAKE_CASE_CODE = /^[a-z0-9_]+$/

export const codeFieldSchema = z
  .string()
  .trim()
  .min(1, 'Code is required')
  .regex(SNAKE_CASE_CODE, 'Code must be snake_case (a-z, 0-9, _ only, no dots)')

// ---------------------------------------------------------------------------
// Screens (GET /api/rbac/screens → { modules })
// ---------------------------------------------------------------------------

export const screenButtonLinkSchema = z.object({
  buttonId: z.string(),
  code: z.string(),
  permissionId: z.string(),
  permissionName: z.string(),
  isActive: z.boolean(),
})
export type ScreenButtonLink = z.infer<typeof screenButtonLinkSchema>

export const screenSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  route: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  roleIds: z.array(z.string()),
  permissionIds: z.array(z.string()),
  buttons: z.array(screenButtonLinkSchema),
})
export type Screen = z.infer<typeof screenSchema>

export const moduleWithScreensSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  activityTypeCodes: z.array(z.string()),
  screens: z.array(screenSchema),
})
export type ModuleWithScreens = z.infer<typeof moduleWithScreensSchema>

export const screensPayloadSchema = z.object({
  modules: z.array(moduleWithScreensSchema),
})
export type ScreensPayload = z.infer<typeof screensPayloadSchema>

// ---------------------------------------------------------------------------
// Screen write inputs (POST/PATCH /api/rbac/screens, PUT .../access)
// ---------------------------------------------------------------------------

export const createScreenInputSchema = z.object({
  code: codeFieldSchema,
  name: z.string().trim().min(1, 'Name is required'),
  route: z.string().trim().min(1, 'Route is required'),
  description: z.string().trim().nullable().optional(),
  icon: z.string().trim().nullable().optional(),
  moduleId: z.string().min(1, 'Module is required'),
  sortOrder: z.number().int().min(0).optional(),
})
export type CreateScreenInput = z.infer<typeof createScreenInputSchema>

export const updateScreenInputSchema = z.object({
  id: z.string().min(1),
  code: codeFieldSchema.optional(),
  name: z.string().trim().min(1).optional(),
  route: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  icon: z.string().trim().nullable().optional(),
  moduleId: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})
export type UpdateScreenInput = z.infer<typeof updateScreenInputSchema>

export const setScreenAccessInputSchema = z.object({
  screenId: z.string().min(1),
  roleIds: z.array(z.string()),
  permissionIds: z.array(z.string()),
})
export type SetScreenAccessInput = z.infer<typeof setScreenAccessInputSchema>

export const setScreenButtonsInputSchema = z.object({
  screenId: z.string().min(1),
  buttonIds: z.array(z.string()),
})
export type SetScreenButtonsInput = z.infer<typeof setScreenButtonsInputSchema>

// ---------------------------------------------------------------------------
// Permission buttons (GET/POST/PATCH/DELETE /api/rbac/buttons)
// ---------------------------------------------------------------------------

export const permissionButtonSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isSystem: z.boolean(),
})
export type PermissionButton = z.infer<typeof permissionButtonSchema>

export const createButtonInputSchema = z.object({
  code: codeFieldSchema,
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().nullable().optional(),
})
export type CreateButtonInput = z.infer<typeof createButtonInputSchema>

export const updateButtonInputSchema = z.object({
  id: z.string().min(1),
  code: codeFieldSchema.optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
})
export type UpdateButtonInput = z.infer<typeof updateButtonInputSchema>

// ---------------------------------------------------------------------------
// Response envelopes ({ success, data })
// ---------------------------------------------------------------------------

const successEnvelope = <T extends z.ZodType>(schema: T) =>
  z.object({
    success: z.literal(true),
    data: schema,
  })

export const screensResponseSchema = successEnvelope(screensPayloadSchema)
export const buttonsResponseSchema = successEnvelope(
  z.array(permissionButtonSchema)
)
export const successResponseSchema = z.object({
  success: z.literal(true),
})
