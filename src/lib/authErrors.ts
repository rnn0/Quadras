/** Traduz mensagens comuns do Supabase Auth para português */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Este e-mail já está cadastrado.'
  }

  if (
    m.includes('email rate limit') ||
    m.includes('over_email_send_rate_limit') ||
    m.includes('email_send_rate_limit') ||
    (m.includes('rate limit') && m.includes('email'))
  ) {
    return 'Muitas tentativas de envio de e-mail. Aguarde alguns minutos e tente novamente.'
  }

  if (m.includes('error sending recovery email') || m.includes('sending recovery email')) {
    return 'Não foi possível enviar o e-mail de recuperação. Verifique o envio de e-mail (SMTP / resend) no painel do Supabase ou tente mais tarde.'
  }

  if (
    (m.includes('redirect') || m.includes('redirect_to')) &&
    (m.includes('not allowed') || m.includes('invalid') || m.includes('misconfigured'))
  ) {
    return 'O endereço de retorno não está autorizado. No Supabase, em Authentication → URL Configuration, inclua a URL do site em Redirect URLs (incluindo a rota /atualizar-senha).'
  }

  if (
    m.includes('invalid email') ||
    m.includes('unable to validate email address') ||
    m.includes('email address is invalid')
  ) {
    return 'E-mail inválido.'
  }

  if (
    m.includes('password') &&
    (m.includes('at least') ||
      m.includes('least 6') ||
      m.includes('too short') ||
      m.includes('length') ||
      m.includes('weak') ||
      m.includes('should be'))
  ) {
    return 'Senha inválida. Use pelo menos 6 caracteres.'
  }

  return message
}
