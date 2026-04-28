import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  fimDiaExclusivoBrasilIso,
  formatarHoraBrasil,
  inicioDiaBrasilIso,
  montarIsoReservaBrasil,
} from '../lib/brasilDatetime'
import { supabase } from '../lib/supabase'
import styles from './LoginPage.module.css'

type ReservaItem = {
  id: number | string
  inicio: string
  fim: string
  user_id: string
}

type QuadraInfo = {
  id: number | string
  tipo: string
  descricao: string
}

type AcessorioOption = 'Nenhum' | 'Bola' | 'Raquete' | 'Raquete e bola'

export function ReservaQuadraPage() {
  const navigate = useNavigate()
  const { empresa: empresaParam, quadraId } = useParams()
  const empresaNome = useMemo(() => decodeURIComponent(empresaParam ?? ''), [empresaParam])
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [quadra, setQuadra] = useState<QuadraInfo | null>(null)
  const [reservasDia, setReservasDia] = useState<ReservaItem[]>([])
  const [dataReserva, setDataReserva] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [acessorios, setAcessorios] = useState<AcessorioOption>('Nenhum')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelandoId, setCancelandoId] = useState<number | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !empresaNome || !quadraId) return
    setLoading(true)
    supabase
      .from('quadras')
      .select('id, tipo, descricao')
      .eq('empresa', empresaNome)
      .eq('id', quadraId)
      .maybeSingle()
      .then(({ data, error: fetchErr }) => {
        setLoading(false)
        if (fetchErr || !data) {
          setError('Nao foi possivel encontrar a quadra selecionada.')
          return
        }
        setQuadra(data as QuadraInfo)
      })
  }, [session, empresaNome, quadraId])

  async function carregarReservasDia(): Promise<ReservaItem[]> {
    if (!quadraId || !dataReserva) {
      setReservasDia([])
      return []
    }
    const inicioDia = inicioDiaBrasilIso(dataReserva)
    const fimExclusivo = fimDiaExclusivoBrasilIso(dataReserva)
    const { data, error: fetchErr } = await supabase
      .from('reservas')
      .select('id, inicio, fim, user_id')
      .eq('quadra_id', quadraId)
      .gte('inicio', inicioDia)
      .lt('inicio', fimExclusivo)
      .order('inicio', { ascending: true })
    if (fetchErr) return []
    const items = (data ?? []) as ReservaItem[]
    setReservasDia(items)
    return items
  }

  useEffect(() => {
    void carregarReservasDia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quadraId, dataReserva])

  async function cancelarMinhaReserva(reservaId: number | string) {
    if (!session) return
    if (!window.confirm('Cancelar esta reserva?')) return
    setError(null)
    setSuccess(null)
    setCancelandoId(reservaId)
    const { data: removidas, error: delErr } = await supabase
      .from('reservas')
      .delete()
      .eq('id', reservaId)
      .eq('user_id', session.user.id)
      .select('id')
    setCancelandoId(null)
    if (delErr) {
      setError(`Nao foi possivel cancelar: ${delErr.message}`)
      return
    }
    if (removidas?.length) {
      setSuccess('Reserva cancelada.')
      await carregarReservasDia()
      return
    }
    const listaAtualizada = await carregarReservasDia()
    const idAlvo = String(reservaId)
    if (!listaAtualizada.some((r) => String(r.id) === idAlvo)) {
      setSuccess('Reserva cancelada.')
      return
    }
    setError(
      'Nao foi possivel cancelar. No Supabase, ative politica RLS de DELETE em reservas para o proprio usuario (arquivo supabase/policies_reservas_delete.sql).',
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!session || !quadraId || !quadra) {
      setError('Sessao invalida para reservar.')
      return
    }
    if (!dataReserva || !horaInicio || !horaFim) {
      setError('Informe data, hora de inicio e hora de fim.')
      return
    }

    const inicioIso = montarIsoReservaBrasil(dataReserva, horaInicio)
    const fimIso = montarIsoReservaBrasil(dataReserva, horaFim)
    if (new Date(inicioIso).getTime() >= new Date(fimIso).getTime()) {
      setError('O horario de fim deve ser maior que o de inicio.')
      return
    }

    setSaving(true)
    const { data: conflitos, error: conflitoErr } = await supabase
      .from('reservas')
      .select('id')
      .eq('quadra_id', quadraId)
      .lt('inicio', fimIso)
      .gt('fim', inicioIso)
      .limit(1)

    if (conflitoErr) {
      setSaving(false)
      setError(`Nao foi possivel validar conflito de horario: ${conflitoErr.message}`)
      return
    }

    if ((conflitos ?? []).length > 0) {
      setSaving(false)
      setError('Este horario ja foi reservado por outro usuario.')
      return
    }

    const { error: insertErr } = await supabase.from('reservas').insert({
      quadra_id: quadraId,
      empresa: empresaNome,
      user_id: session.user.id,
      inicio: inicioIso,
      fim: fimIso,
      acessorios: acessorios === 'Nenhum' ? null : acessorios,
    })
    setSaving(false)

    if (insertErr) {
      setError(`Nao foi possivel salvar a reserva: ${insertErr.message}`)
      return
    }

    setSuccess('Reserva realizada com sucesso!')
    setHoraInicio('')
    setHoraFim('')
    setAcessorios('Nenhum')
    await carregarReservasDia()
  }

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
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className={styles.layout}>
      <div className={styles.bgPattern} aria-hidden />
      <div className={`${styles.shell} ${styles.userHomeShell}`}>
        <main className={`${styles.panel} ${styles.userHomePanel}`}>
          <section className={styles.userHomeWrap}>
            <div className={`${styles.card} ${styles.userHomeHeader}`}>
              <div>
                <h1 className={styles.title}>Reservar quadra</h1>
                <p className={styles.subtitle}>
                  {empresaNome} - {quadra ? `${quadra.tipo} (${quadra.descricao})` : 'Carregando quadra...'}
                </p>
              </div>
              <button
                type="button"
                className={`${styles.submit} ${styles.adminActionBtn} ${styles.adminActionBtnGhost}`}
                onClick={() => navigate(`/empresa/${encodeURIComponent(empresaNome)}`)}
              >
                Voltar
              </button>
            </div>

            {loading ? (
              <div className={styles.card}>
                <p className={styles.subtitle}>Carregando dados da quadra...</p>
              </div>
            ) : (
              <div className={styles.adminGrid}>
                <div className={`${styles.card} ${styles.adminCard}`}>
                  <h2 className={styles.title}>Nova reserva</h2>
                  <form className={styles.form} onSubmit={handleSubmit} noValidate>
                    {error ? <p className={styles.formError}>{error}</p> : null}
                    {success ? <p className={styles.formSuccess}>{success}</p> : null}

                    <label className={styles.field}>
                      <span className={styles.label}>Data</span>
                      <input
                        className={styles.input}
                        type="date"
                        value={dataReserva}
                        onChange={(e) => setDataReserva(e.target.value)}
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Horario de inicio</span>
                      <input
                        className={styles.input}
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Horario de fim</span>
                      <input
                        className={styles.input}
                        type="time"
                        value={horaFim}
                        onChange={(e) => setHoraFim(e.target.value)}
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Acessorios</span>
                      <select
                        className={styles.input}
                        value={acessorios}
                        onChange={(e) => setAcessorios(e.target.value as AcessorioOption)}
                      >
                        <option value="Nenhum">Nenhum</option>
                        <option value="Bola">Bola</option>
                        <option value="Raquete">Raquete</option>
                        <option value="Raquete e bola">Raquete e bola</option>
                      </select>
                    </label>
                    <button type="submit" className={styles.submit} disabled={saving}>
                      {saving ? 'Reservando...' : 'Confirmar reserva'}
                    </button>
                  </form>
                </div>

                <div className={`${styles.card} ${styles.adminCard}`}>
                  <h2 className={styles.title}>Reservas do dia</h2>
                  {!dataReserva ? (
                    <p className={styles.subtitle}>Selecione uma data para ver horarios ja reservados.</p>
                  ) : reservasDia.length === 0 ? (
                    <p className={styles.subtitle}>Nenhuma reserva para esta data.</p>
                  ) : (
                    <div className={styles.adminQuadraList}>
                      {reservasDia.map((reserva) => {
                        const minha = reserva.user_id === session.user.id
                        return (
                          <article key={reserva.id} className={styles.adminQuadraItem}>
                            <div className={styles.adminReservaLinha}>
                              <p className={styles.subtitle} style={{ margin: 0 }}>
                                <strong>
                                  {formatarHoraBrasil(reserva.inicio)} -{' '}
                                  {formatarHoraBrasil(reserva.fim)}
                                </strong>
                              </p>
                              {minha ? (
                                <button
                                  type="button"
                                  className={`${styles.submit} ${styles.adminActionBtn} ${styles.adminActionBtnGhost}`}
                                  disabled={cancelandoId === reserva.id}
                                  onClick={() => void cancelarMinhaReserva(reserva.id)}
                                >
                                  {cancelandoId === reserva.id ? 'Cancelando...' : 'Cancelar minha reserva'}
                                </button>
                              ) : null}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
