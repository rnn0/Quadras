import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const hasCredentials = Boolean(envUrl && envKey)

// Sem .env, createClient('', '') quebra o app (tela branca). Usamos placeholders válidos só para o bundle carregar.
export const supabase = createClient(
  hasCredentials ? envUrl! : 'http://127.0.0.1',
  hasCredentials ? envKey! : 'sb-placeholder-anon-key',
)

export function isSupabaseConfigured(): boolean {
  return hasCredentials
}
