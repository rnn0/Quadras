import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { mapAuthError } from '../lib/authErrors'
import styles from './LoginPage.module.css'

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function AdminRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [celular, setCelular] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const expectedToken = import.meta.env.VITE_ADMIN_SIGNUP_TOKEN?.trim()
  const tokenFromUrl = searchParams.get('token')?.trim()
  const hasValidToken = useMemo(() => {
    if (!expectedToken) return false
    return tokenFromUrl === expectedToken
  }, [expectedToken, tokenFromUrl])

  async function registrarEmpresaAdmin(
    empresaNome: string,
    adminUserId: string | undefined,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!adminUserId) {
      return { ok: false, message: 'Nao foi possivel identificar o usuario administrador.' }
    }
    const { error: upsertErr } = await supabase.from('empresas').insert({
      nome: empresaNome,
      admin_user_id: adminUserId,
    })
    if (!upsertErr) return { ok: true }

    // Se ja existir (empresa ou admin) nao precisamos falhar.
    if (String((upsertErr as { code?: string }).code ?? '') === '23505') return { ok: true }

    return {
      ok: false,
      message: `Administrador cadastrado, mas nao foi possivel criar a empresa automaticamente: ${upsertErr.message}`,
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!hasValidToken) {
      setError('Acesso inválido para cadastro administrativo.')
      return
    }

    if (!isSupabaseConfigured()) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
      return
    }

    const nomeTrim = nome.trim()
    const empresaTrim = empresa.trim()
    const digits = onlyDigits(celular)

    if (nomeTrim.length < 2) {
      setError('Informe o nome do administrador.')
      return
    }
    if (empresaTrim.length < 2) {
      setError('Informe o nome da empresa.')
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
          empresa: empresaTrim,
          role: 'admin',
          empresa_owner: true,
        },
      },
    })
    setLoading(false)

    if (signErr) {
      setError(mapAuthError(signErr.message))
      return
    }

    // Se o Supabase exigir confirmacao de e-mail, normalmente nao existe sessao aqui.
    // Nesse caso, a insercao em "empresas" costuma falhar por RLS (usuario ainda nao autenticado).
    // A pagina /inicio faz a criacao da empresa no primeiro login do admin.
    if (data.session) {
      const res = await registrarEmpresaAdmin(empresaTrim, data.user?.id)
      if (!res.ok) {
        setError(res.message)
        return
      }
    }

    if (data.session) {
      navigate('/inicio', { replace: true })
      return
    }

    setSuccess(
      'Administrador cadastrado. Verifique o e-mail para confirmar a conta. A empresa sera vinculada automaticamente no primeiro login.',
    )
  }

  if (!expectedToken || !hasValidToken) {
    return (
      <div className={styles.layout}>
        <div className={styles.bgPattern} aria-hidden />
        <div className={styles.shell} style={{ gridTemplateColumns: '1fr', maxWidth: 560 }}>
          <main className={styles.panel} style={{ padding: '2rem' }}>
            <div className={styles.card}>
              <h1 className={styles.title}>Página indisponível</h1>
              <p className={styles.subtitle}>
                Este endereço não está disponível para acesso público.
              </p>
              <p className={styles.footer} style={{ marginTop: '1rem' }}>
                <Link to="/login" className={styles.linkInline}>
                  Voltar ao login
                </Link>
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
            <p className={styles.heroKicker}>Área interna</p>
            <h1 className={styles.heroTitle}>
              Cadastro de
              <span className={styles.heroAccent}> administrador</span>
            </h1>
            <p className={styles.heroLead}>
              Cadastre o dono da empresa para gerenciar quadras e reservas.
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
                <h2 className={styles.title}>Cadastrar administrador</h2>
                <p className={styles.subtitle}>
                  Este acesso define o dono da empresa na plataforma
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {error ? <p className={styles.formError}>{error}</p> : null}
              {success ? <p className={styles.formSuccess}>{success}</p> : null}

              <label className={styles.field}>
                <span className={styles.label}>E-mail do administrador</span>
                <input
                  className={styles.input}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Nome do administrador</span>
                <input
                  className={styles.input}
                  type="text"
                  name="nome"
                  autoComplete="name"
                  placeholder="Nome completo"
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
                <span className={styles.label}>Empresa</span>
                <input
                  className={styles.input}
                  type="text"
                  name="empresa"
                  autoComplete="organization"
                  placeholder="Nome da empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
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
                {loading ? 'Cadastrando…' : 'Cadastrar administrador'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
