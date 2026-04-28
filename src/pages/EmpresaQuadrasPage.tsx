import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import styles from './LoginPage.module.css'

type TipoQuadra = 'Vôlei' | 'Basquete' | 'Beach Tennis'

type DiaSemana =
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado'
  | 'domingo'

type HorarioDia = {
  ativo: boolean
  inicio: string
  fim: string
}

type HorariosSemana = Record<DiaSemana, HorarioDia>

type QuadraPublica = {
  id: number | string
  descricao: string
  horarios: string | HorariosSemana
  tipo: TipoQuadra
}

const ORDEM_TIPO: Record<TipoQuadra, number> = {
  'Vôlei': 0,
  Basquete: 1,
  'Beach Tennis': 2,
}

const DIAS: Array<{ key: DiaSemana; label: string }> = [
  { key: 'segunda', label: 'Segunda' },
  { key: 'terca', label: 'Terca' },
  { key: 'quarta', label: 'Quarta' },
  { key: 'quinta', label: 'Quinta' },
  { key: 'sexta', label: 'Sexta' },
  { key: 'sabado', label: 'Sabado' },
  { key: 'domingo', label: 'Domingo' },
]

function parseHorarios(valor: string | HorariosSemana): HorariosSemana | null {
  if (typeof valor !== 'string') return valor
  try {
    return JSON.parse(valor) as HorariosSemana
  } catch {
    return null
  }
}

function listarHorarios(horarios: string | HorariosSemana): string[] {
  const parsed = parseHorarios(horarios)
  if (!parsed) return [String(horarios)]
  return DIAS.filter((dia) => parsed[dia.key]?.ativo).map(
    (dia) => `${dia.label}: ${parsed[dia.key].inicio} - ${parsed[dia.key].fim}`,
  )
}

function CourtIcon({ tipo }: { tipo: TipoQuadra }) {
  if (tipo === 'Vôlei') {
    return (
      <svg viewBox="0 0 140 80" className={styles.courtSvg} aria-hidden>
        <rect x="6" y="10" width="128" height="60" rx="8" />
        <line x1="70" y1="12" x2="70" y2="68" />
        <line x1="58" y1="12" x2="58" y2="68" />
        <line x1="82" y1="12" x2="82" y2="68" />
      </svg>
    )
  }
  if (tipo === 'Basquete') {
    return (
      <svg viewBox="0 0 140 80" className={styles.courtSvg} aria-hidden>
        <rect x="6" y="10" width="128" height="60" rx="8" />
        <line x1="70" y1="12" x2="70" y2="68" />
        <circle cx="70" cy="40" r="10" />
        <path d="M6 24h14a12 12 0 0 1 12 12v8a12 12 0 0 1-12 12H6" />
        <path d="M134 24h-14a12 12 0 0 0-12 12v8a12 12 0 0 0 12 12h14" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 140 80" className={styles.courtSvg} aria-hidden>
      <rect x="6" y="10" width="128" height="60" rx="20" />
      <line x1="70" y1="12" x2="70" y2="68" />
      <line x1="30" y1="12" x2="30" y2="68" />
      <line x1="110" y1="12" x2="110" y2="68" />
      <circle cx="70" cy="40" r="3.5" />
    </svg>
  )
}

export function EmpresaQuadrasPage() {
  const navigate = useNavigate()
  const { empresa: empresaParam } = useParams()
  const empresaNome = useMemo(() => decodeURIComponent(empresaParam ?? ''), [empresaParam])
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [quadras, setQuadras] = useState<QuadraPublica[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !empresaNome) return
    setLoading(true)
    setError(null)
    supabase
      .from('quadras')
      .select('id, descricao, horarios, tipo')
      .eq('empresa', empresaNome)
      .order('id', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        setLoading(false)
        if (fetchErr) {
          setError(`Nao foi possivel carregar quadras: ${fetchErr.message}`)
          return
        }
        const lista = ((data ?? []) as QuadraPublica[]).sort((a, b) => {
          const ordemTipo = ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo]
          if (ordemTipo !== 0) return ordemTipo
          return String(a.descricao).localeCompare(String(b.descricao))
        })
        setQuadras(lista)
      })
  }, [session, empresaNome])

  if (session === undefined) {
    return (
      <div className={styles.layout}>
        <div className={styles.bgPattern} aria-hidden />
        <p className={styles.heroLead} style={{ padding: '2rem', margin: 0 }}>
          Carregando...
        </p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className={styles.layout}>
      <div className={styles.bgPattern} aria-hidden />
      <div className={`${styles.shell} ${styles.userHomeShell}`}>
        <main className={`${styles.panel} ${styles.userHomePanel}`}>
          <section className={styles.userHomeWrap}>
            <div className={`${styles.card} ${styles.userHomeHeader}`}>
              <div>
                <h1 className={styles.title}>{empresaNome || 'Empresa'}</h1>
                <p className={styles.subtitle}>
                  Escolha uma quadra para continuar com a reserva.
                </p>
              </div>
              <div className={styles.adminActions}>
                <button
                  type="button"
                  className={`${styles.submit} ${styles.adminActionBtn} ${styles.adminActionBtnGhost}`}
                  onClick={() => navigate('/inicio')}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  className={`${styles.submit} ${styles.adminActionBtn}`}
                  onClick={() => supabase.auth.signOut()}
                >
                  Sair
                </button>
              </div>
            </div>

            {error ? <p className={styles.formError}>{error}</p> : null}

            {loading ? (
              <div className={styles.card}>
                <p className={styles.subtitle}>Carregando quadras...</p>
              </div>
            ) : quadras.length === 0 ? (
              <div className={styles.card}>
                <h2 className={styles.title}>Sem quadras disponiveis</h2>
                <p className={styles.subtitle}>
                  Esta empresa ainda nao cadastrou quadras para reserva.
                </p>
                <p className={styles.footer}>
                  <Link to="/inicio" className={styles.linkInline}>
                    Voltar para empresas
                  </Link>
                </p>
              </div>
            ) : (
              <div className={styles.companyGrid}>
                {quadras.map((quadra) => (
                  <article key={quadra.id} className={`${styles.card} ${styles.companyCard}`}>
                    <CourtIcon tipo={quadra.tipo} />
                    <h2 className={styles.title}>{quadra.tipo}</h2>
                    <p className={styles.subtitle}>
                      <strong>Descricao:</strong> {quadra.descricao}
                    </p>
                    <div>
                      <p className={styles.subtitle}>
                        <strong>Horarios:</strong>
                      </p>
                      <ul className={styles.adminSchedulePreview}>
                        {listarHorarios(quadra.horarios).map((linha) => (
                          <li key={`${quadra.id}-${linha}`}>{linha}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      className={`${styles.submit} ${styles.companyActionBtn}`}
                      onClick={() =>
                        navigate(
                          `/empresa/${encodeURIComponent(empresaNome)}/quadra/${quadra.id}/reservar`,
                        )
                      }
                    >
                      Reservar esta quadra
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
