import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://placeholder.supabase.co'

const supabaseServiceRoleKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'placeholder-key'

if (
  !process.env.VITE_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.SUPABASE_URL
) {
  console.warn(
    '[Supabase Server] Warning: Missing Supabase server environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'
  )
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

