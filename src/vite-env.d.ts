/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SITE_URL?: string
  /** URL absoluta da tela de login após confirmar e-mail (ex.: https://seu-app.vercel.app/login) */
  readonly VITE_AUTH_CONFIRM_URL?: string
  readonly VITE_ADMIN_SIGNUP_PATH?: string
  readonly VITE_ADMIN_SIGNUP_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
