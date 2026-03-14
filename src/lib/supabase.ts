import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

let getSupabaseToken: (() => Promise<string | null>) | null = null

export const setSupabaseTokenGetter = (getter: typeof getSupabaseToken) => {
  getSupabaseToken = getter
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      const headers = new Headers(options.headers)

      if (getSupabaseToken) {
        const token = await getSupabaseToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }

      return fetch(url, {
        ...options,
        headers,
      })
    },
  },
})
