import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://placeholder.supabase.co'

const supabaseServiceRoleKey =
  process.env.VITE_SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_SECRET_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
  'placeholder-key'



export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

