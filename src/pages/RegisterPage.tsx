import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { mapAuthError } from '../lib/authErrors'
import styles from './LoginPage.module.css'

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [celular, setCelular] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isSupabaseConfigured()) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
      return
    }

    const nomeTrim = nome.trim()
    const digits = onlyDigits(celular)
    if (nomeTrim.length < 2) {
      setError('Informe seu nome completo.')
      return
    }
    if (digits.length < 10 || digits.length > 13) {
      setError('Informe um celular válido (DDD + número).')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere.')
      return
    }

    setLoading(true)
    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nome: nomeTrim,
          celular: digits,
        },
      },
    })
    setLoading(false)

    if (signErr) {
      setError(mapAuthError(signErr.message))
      return
    }

    if (data.session) {
      navigate('/inicio', { replace: true })
      return
    }

    setSuccess(
      'Cadastro enviado. Verifique seu e-mail para confirmar a conta antes de entrar.',
    )
  }

  return (
    <div className={styles.layout}>
      <div className={styles.bgPattern} aria-hidden />
      <div className={styles.shell}>
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.heroKicker}>Arena multi-esportes</p>
            <h1 className={styles.heroTitle}>
              Crie sua conta,
              <span className={styles.heroAccent}> reserve em minutos</span>
            </h1>
            <p className={styles.heroLead}>
              Um cadastro rápido para acessar quadras de beach tennis, vôlei e
              basquete quando quiser.
            </p>
            <ul className={styles.sports}>
              <li>Beach tennis</li>
              <li>Vôlei</li>
              <li>Basquete</li>
            </ul>
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
                <h2 className={styles.title}>Criar conta</h2>
                <p className={styles.subtitle}>
                  Preencha os dados para começar a reservar quadras
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {error ? <p className={styles.formError}>{error}</p> : null}
              {success ? <p className={styles.formSuccess}>{success}</p> : null}

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
                <span className={styles.label}>Nome</span>
                <input
                  className={styles.input}
                  type="text"
                  name="nome"
                  autoComplete="name"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Celular</span>
                <input
                  className={styles.input}
                  type="tel"
                  name="celular"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  placeholder="(00) 00000-0000"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Senha</span>
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
                <span className={styles.label}>Confirmar senha</span>
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
                {loading ? 'Cadastrando…' : 'Cadastrar'}
              </button>
            </form>

            <p className={styles.footer}>
              Já tem conta?{' '}
              <Link to="/login" className={styles.linkInline}>
                Entrar
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
