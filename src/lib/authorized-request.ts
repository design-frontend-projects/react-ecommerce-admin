export type TokenGetter = () => Promise<string | null>

/**
 * Shared fetch helper for server-authoritative `/api/*` calls: attaches the
 * Supabase bearer token, sets JSON content-type on writes, and unwraps the
 * `{ success, data, error }` envelope error messages. Mirrors the helper in
 * `src/features/users/data/actions.ts`.
 */
export async function authorizedRequest(
  getToken: TokenGetter,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<unknown> {
  const token = await getToken()
  if (!token) {
    throw new Error('Your session is not available. Please sign in again.')
  }

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, { ...init, headers })
  const payload = (await response
    .json()
    .catch(() => ({
      success: false,
      message: 'Unexpected server response.',
    }))) as {
    message?: string
    error?: { message?: string } | string
    details?: string
  }

  if (!response.ok) {
    const errorMessage =
      payload?.message ??
      (typeof payload?.error === 'object'
        ? payload?.error?.message
        : payload?.error) ??
      payload?.details ??
      'Request failed.'
    throw new Error(errorMessage)
  }

  return payload
}
