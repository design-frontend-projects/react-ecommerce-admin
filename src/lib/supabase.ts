import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('[Bluewave POS] Supabase credentials missing from .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://agpyqixxpwowlmtvrqh.supabase.co',
  supabaseAnonKey || 'placeholder',
)
