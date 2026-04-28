import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { mapAuthError } from '../lib/authErrors'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const passwordResetOk = (location.state as { passwordReset?: boolean } | null)?.passwordReset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isSupabaseConfigured()) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
      return
    }

    setLoading(true)
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (signErr) {
      setError(mapAuthError(signErr.message))
      return
    }

    navigate('/inicio', { replace: true })
  }

  return (
    <div className={styles.layout}>
      <div className={styles.bgPattern} aria-hidden />
      <div className={styles.shell}>
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.heroKicker}>Arena multi-esportes</p>
            <h1 className={styles.heroTitle}>
              Suas quadras,
              <span className={styles.heroAccent}> no horário certo</span>
            </h1>
            <p className={styles.heroLead}>
              Beach tennis, vôlei e basquete em um só lugar. Reserve online com
              facilidade e aproveite cada jogo.
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
                <h2 className={styles.title}>Entrar</h2>
                <p className={styles.subtitle}>
                  Acesse para ver disponibilidade e fazer reservas
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {passwordResetOk ? (
                <p className={styles.formSuccess}>
                  Senha atualizada com sucesso. Faça login com sua nova senha.
                </p>
              ) : null}
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
              <label className={styles.field}>
                <span className={styles.label}>Senha</span>
                <input
                  className={styles.input}
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>

              <div className={styles.row}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Lembrar-me neste dispositivo
                </label>
                <Link to="/recuperar-senha" className={styles.linkBtn}>
                  Esqueci a senha
                </Link>
              </div>

              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

            <p className={styles.footer}>
              Novo por aqui?{' '}
              <Link to="/cadastro" className={styles.linkInline}>
                Criar conta
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
