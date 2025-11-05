import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_CONFIG } from "../config"

// Cache the client instance to avoid multiple GoTrueClient instances
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) {
    return client
  }

  client = createBrowserClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
  return client
}
