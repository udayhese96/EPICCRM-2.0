import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_CONFIG } from "../config"

export function createClient() {
  return createBrowserClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
}
