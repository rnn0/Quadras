import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { mapAuthError } from '../lib/authErrors'
import styles from './LoginPage.module.css'

type Phase = 'loading' | 'ready' | 'invalid' | 'success'

export function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setPhase('invalid')
      return
    }

    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const hasPkceCode = params.has('code')
    const hasImplicitRecovery =
      hash.includes('type=recovery') ||
      hash.includes('type%3Drecovery') ||
      /[?&]type=recovery/.test(window.location.search)
    const hasAccessTokenInHash = hash.includes('access_token')

    if (!hasPkceCode && !hasImplicitRecovery && !hasAccessTokenInHash) {
      setPhase('invalid')
      return
    }

    let cancelled = false
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY') {
        setPhase('ready')
      }
    })

    const failTimer = window.setTimeout(() => {
      if (!cancelled) {
        setPhase((p) => (p === 'loading' ? 'invalid' : p))
      }
    }, 15000)

    return () => {
      cancelled = true
      window.clearTimeout(failTimer)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateErr) {
      setError(mapAuthError(updateErr.message))
      return
    }

    setPhase('success')
    await supabase.auth.signOut()
    window.setTimeout(() => navigate('/login', { replace: true, state: { passwordReset: true } }), 1500)
  }

  if (phase === 'loading') {
    return (
      <div className={styles.layout}>
        <div className={styles.bgPattern} aria-hidden />
        <div className={styles.shell} style={{ gridTemplateColumns: '1fr', maxWidth: 480 }}>
          <main className={styles.panel} style={{ padding: '2rem' }}>
            <div className={styles.card}>
              <p className={styles.subtitle} style={{ margin: 0 }}>
                Validando link…
              </p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (phase === 'invalid') {
    return (
      <div className={styles.layout}>
        <div className={styles.bgPattern} aria-hidden />
        <div className={styles.shell} style={{ gridTemplateColumns: '1fr', maxWidth: 480 }}>
          <main className={styles.panel} style={{ padding: '2rem' }}>
            <div className={styles.card}>
              <h2 className={styles.title}>Link inválido ou expirado</h2>
              <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
                Peça um novo e-mail de redefinição de senha e tente de novo.
              </p>
              <p className={styles.footer} style={{ margin: 0 }}>
                <Link to="/recuperar-senha" className={styles.linkInline}>
                  Solicitar novo link
                </Link>
                {' · '}
                <Link to="/login" className={styles.linkInline}>
                  Login
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div className={styles.layout}>
        <div className={styles.bgPattern} aria-hidden />
        <div className={styles.shell} style={{ gridTemplateColumns: '1fr', maxWidth: 480 }}>
          <main className={styles.panel} style={{ padding: '2rem' }}>
            <div className={styles.card}>
              <p className={styles.formSuccess} style={{ margin: 0 }}>
                Senha atualizada! Redirecionando para o login…
              </p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <div className={styles.bgPattern} aria-hidden />
      <div className={styles.shell}>
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.heroKicker}>Segurança</p>
            <h1 className={styles.heroTitle}>
              Nova senha,
              <span className={styles.heroAccent}> pronta para o jogo</span>
            </h1>
            <p className={styles.heroLead}>
              Escolha uma senha forte e guarde em local seguro. Você usará esse e-mail e a nova
              senha para entrar na Arena Quadras.
            </p>
          </div>
        </div>

        <main className={styles.panel}>
          <div className={`${styles.card} ${styles.cardWide}`}>
            <div className={styles.cardHeader}>
              <div className={styles.logoMark} aria-hidden>
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="10" width="32" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M20 10v22M4 21h32" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
                </svg>
              </div>
              <div>
                <h2 className={styles.title}>Definir nova senha</h2>
                <p className={styles.subtitle}>Digite e confirme sua nova senha abaixo.</p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {error ? <p className={styles.formError}>{error}</p> : null}

              <label className={styles.field}>
                <span className={styles.label}>Nova senha</span>
                <input
                  className={styles.input}
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Confirmar nova senha</span>
                <input
                  className={styles.input}
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>

              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? 'Salvando…' : 'Salvar nova senha'}
              </button>

              <p className={styles.footer}>
                <Link to="/login" className={styles.linkInline}>
                  Voltar ao login
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
