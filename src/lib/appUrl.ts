function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '')
}

/** URL base do app (para redirect do e-mail de recuperação). Produção: configure o mesmo domínio no Supabase. */
export function getPasswordResetRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/atualizar-senha`
  }
  const site = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '')
  return site ? `${site}/atualizar-senha` : 'http://localhost:5173/atualizar-senha'
}

/**
 * URL após o usuário confirmar o e-mail do cadastro (opção `emailRedirectTo` do signUp).
 * No deploy (ex.: Vercel), `window.location.origin` costuma ser suficiente.
 * Opcional: defina `VITE_AUTH_CONFIRM_URL` (ex.: https://quadras-nu.vercel.app/login) na Vercel
 * e inclua esse URL em Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function getEmailConfirmationRedirectUrl(): string {
  const explicit = import.meta.env.VITE_AUTH_CONFIRM_URL?.trim()
  if (explicit) return trimTrailingSlash(explicit)

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`
  }

  const site = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '')
  return site ? `${site}/login` : 'http://localhost:5173/login'
}
