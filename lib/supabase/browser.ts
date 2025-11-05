import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config'

// Ensure only ONE browser Supabase client exists per tab
const getBrowserClient = (): SupabaseClient => {
  const g = globalThis as unknown as { __epiccrm_supabase?: SupabaseClient }
  if (g.__epiccrm_supabase) return g.__epiccrm_supabase

  const client = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'epiccrm-browser-auth'
    }
  })
  g.__epiccrm_supabase = client
  return client
}

const supabase = getBrowserClient()
export default supabase










