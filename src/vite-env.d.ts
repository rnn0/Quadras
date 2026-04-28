/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SITE_URL?: string
  readonly VITE_ADMIN_SIGNUP_PATH?: string
  readonly VITE_ADMIN_SIGNUP_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
