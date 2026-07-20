export type TokenGetter = () => Promise<string | null>

/**
 * Fetch wrapper for the `/api/**` server contract: attaches the Supabase bearer token, sets
 * JSON content-type on bodied requests, and unwraps the `{ success, data, error }` envelope,
 * throwing the server-provided message on a non-2xx response.
 */
export async function authorizedRequest(
  getToken: TokenGetter,
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const token = await getToken()
  if (!token) {
    throw new Error('Your session is not available. Please sign in again.')
  }

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const payload = await response
    .json()
    .catch(() => ({ success: false, message: 'Unexpected server response.' }))

  if (!response.ok) {
    throw new Error(
      payload?.message ??
        payload?.error?.message ??
        payload?.error ??
        payload?.details ??
        'Request failed.'
    )
  }

  return payload
}
