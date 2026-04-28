/** Traduz mensagens comuns do Supabase Auth para português */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (m.includes('user already registered')) return 'Este e-mail já está cadastrado.'
  if (m.includes('password')) return 'Senha inválida. Use pelo menos 6 caracteres.'
  if (m.includes('email')) return 'E-mail inválido.'
  return message
}
