import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { getPasswordResetRedirectUrl } from '../lib/appUrl'
import { mapAuthError } from '../lib/authErrors'
import styles from './LoginPage.module.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isSupabaseConfigured()) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
      return
    }

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Informe seu e-mail.')
      return
    }

    setLoading(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: getPasswordResetRedirectUrl(),
    })
    setLoading(false)

    if (resetErr) {
      setError(mapAuthError(resetErr.message))
      return
    }

    setSentToEmail(trimmed)
    setSent(true)
  }

  return (
    <div className={styles.layout}>
      <div className={styles.bgPattern} aria-hidden />
      <div className={styles.shell}>
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.heroKicker}>Arena multi-esportes</p>
            <h1 className={styles.heroTitle}>
              Acesso à conta,
              <span className={styles.heroAccent}> com segurança</span>
            </h1>
            <p className={styles.heroLead}>
              Enviaremos um link seguro para o seu e-mail. Por ele você define uma nova senha
              sem precisar da antiga.
            </p>
            <ul className={styles.sports}>
              <li>Beach tennis</li>
              <li>Vôlei</li>
              <li>Basquete</li>
            </ul>
          </div>
        </div>

        <main className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.logoMark} aria-hidden>
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="10" width="32" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M20 10v22M4 21h32" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                </svg>
              </div>
              <div>
                <h2 className={styles.title}>Esqueci a senha</h2>
                <p className={styles.subtitle}>
                  Digite o e-mail da sua conta para receber o link de redefinição
                </p>
              </div>
            </div>

            {sent ? (
              <div className={styles.form}>
                <p className={styles.formSuccess}>
                  Se existir uma conta para <strong>{sentToEmail}</strong>, enviaremos um e-mail com
                  instruções em instantes. Verifique também a pasta de spam.
                </p>
                <p className={styles.footer} style={{ marginTop: '1rem' }}>
                  <Link to="/login" className={styles.linkInline}>
                    Voltar ao login
                  </Link>
                </p>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                {error ? <p className={styles.formError}>{error}</p> : null}

                <label className={styles.field}>
                  <span className={styles.label}>E-mail</span>
                  <input
                    className={styles.input}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>

                <button type="submit" className={styles.submit} disabled={loading}>
                  {loading ? 'Enviando…' : 'Enviar link por e-mail'}
                </button>

                <p className={styles.footer} style={{ marginTop: '0.5rem' }}>
                  <Link to="/login" className={styles.linkInline}>
                    Voltar ao login
                  </Link>
                </p>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
