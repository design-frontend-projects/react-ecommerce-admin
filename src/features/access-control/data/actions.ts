import {
  authorizedRequest,
  type TokenGetter,
} from '@/lib/authorized-request'
import {
  buttonsResponseSchema,
  createButtonInputSchema,
  createScreenInputSchema,
  screensResponseSchema,
  setScreenAccessInputSchema,
  setScreenButtonsInputSchema,
  successResponseSchema,
  updateButtonInputSchema,
  updateScreenInputSchema,
  type CreateButtonInput,
  type CreateScreenInput,
  type PermissionButton,
  type ScreensPayload,
  type SetScreenAccessInput,
  type SetScreenButtonsInput,
  type UpdateButtonInput,
  type UpdateScreenInput,
} from './schema'

/**
 * Typed fetchers for the access-control admin endpoints. Every request goes
 * through `authorizedRequest` (Supabase bearer token) and every response is
 * re-parsed with Zod before it reaches the UI.
 */

// ---------------------------------------------------------------------------
// Screens registry (/api/rbac/screens)
// ---------------------------------------------------------------------------

export async function fetchScreens(
  getToken: TokenGetter
): Promise<ScreensPayload> {
  const payload = await authorizedRequest(getToken, '/api/rbac/screens')
  return screensResponseSchema.parse(payload).data
}

export async function createScreen(
  getToken: TokenGetter,
  input: CreateScreenInput
) {
  const body = createScreenInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/rbac/screens', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return successResponseSchema.parse(payload)
}

export async function updateScreen(
  getToken: TokenGetter,
  input: UpdateScreenInput
) {
  const body = updateScreenInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/rbac/screens', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return successResponseSchema.parse(payload)
}

export async function deleteScreen(getToken: TokenGetter, screenId: string) {
  const payload = await authorizedRequest(
    getToken,
    `/api/rbac/screens?id=${encodeURIComponent(screenId)}`,
    { method: 'DELETE' }
  )
  return successResponseSchema.parse(payload)
}

export async function setScreenAccess(
  getToken: TokenGetter,
  input: SetScreenAccessInput
) {
  const body = setScreenAccessInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/rbac/screens/access',
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  )
  return successResponseSchema.parse(payload)
}

export async function setScreenButtons(
  getToken: TokenGetter,
  input: SetScreenButtonsInput
) {
  const body = setScreenButtonsInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/rbac/screen-buttons',
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  )
  return successResponseSchema.parse(payload)
}

// ---------------------------------------------------------------------------
// Permission buttons (/api/rbac/buttons)
// ---------------------------------------------------------------------------

export async function fetchButtons(
  getToken: TokenGetter
): Promise<PermissionButton[]> {
  const payload = await authorizedRequest(getToken, '/api/rbac/buttons')
  return buttonsResponseSchema.parse(payload).data
}

export async function createButton(
  getToken: TokenGetter,
  input: CreateButtonInput
) {
  const body = createButtonInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/rbac/buttons', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return successResponseSchema.parse(payload)
}

export async function updateButton(
  getToken: TokenGetter,
  input: UpdateButtonInput
) {
  const body = updateButtonInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/rbac/buttons', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return successResponseSchema.parse(payload)
}

export async function deleteButton(getToken: TokenGetter, buttonId: string) {
  const payload = await authorizedRequest(
    getToken,
    `/api/rbac/buttons?id=${encodeURIComponent(buttonId)}`,
    { method: 'DELETE' }
  )
  return successResponseSchema.parse(payload)
}
