/** URL base do app (para redirect do e-mail de recuperação). Produção: configure o mesmo domínio no Supabase. */
export function getPasswordResetRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/atualizar-senha`
  }
  const site = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '')
  return site ? `${site}/atualizar-senha` : 'http://localhost:5173/atualizar-senha'
}
