import { FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  dataHojeBrasilYmd,
  fimDiaExclusivoBrasilIso,
  formatarHoraBrasil,
  inicioDiaBrasilIso,
} from '../lib/brasilDatetime'
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

type Quadra = {
  id: number | string
  descricao: string
  horarios: string | HorariosSemana
  tipo: TipoQuadra
  created_at: string
  empresa?: string
}

type EmpresaResumo = {
  nome: string
  tipos: TipoQuadra[]
}

type EmpresaRow = {
  nome: string
}

type ReservaAdminItem = {
  id: number | string
  inicio: string
  fim: string
  quadra_id: number | string
  user_id: string
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

function horariosPadrao(): HorariosSemana {
  return {
    segunda: { ativo: true, inicio: '08:00', fim: '22:00' },
    terca: { ativo: true, inicio: '08:00', fim: '22:00' },
    quarta: { ativo: true, inicio: '08:00', fim: '22:00' },
    quinta: { ativo: true, inicio: '08:00', fim: '22:00' },
    sexta: { ativo: true, inicio: '08:00', fim: '22:00' },
    sabado: { ativo: true, inicio: '09:00', fim: '18:00' },
    domingo: { ativo: false, inicio: '09:00', fim: '14:00' },
  }
}

function parseHorarios(valor: string | HorariosSemana): HorariosSemana | null {
  if (typeof valor !== 'string') return valor
  try {
    const parsed = JSON.parse(valor) as HorariosSemana
    return parsed
  } catch {
    return null
  }
}

function gerarIdentificadorQuadra(): string {
  return `QD-${Date.now().toString(36).toUpperCase()}`
}

function listarHorarios(horarios: string | HorariosSemana): string[] {
  const parsed = parseHorarios(horarios)
  if (!parsed) return [String(horarios)]
  return DIAS.filter((dia) => parsed[dia.key]?.ativo).map(
    (dia) => `${dia.label}: ${parsed[dia.key].inicio} - ${parsed[dia.key].fim}`,
  )
}

function normalizarHorarios(horarios: string | HorariosSemana): HorariosSemana {
  return parseHorarios(horarios) ?? horariosPadrao()
}

function validarHorarios(horarios: HorariosSemana): string | null {
  const existeDiaAtivo = DIAS.some((dia) => horarios[dia.key].ativo)
  if (!existeDiaAtivo) return 'Selecione pelo menos um dia de funcionamento.'

  for (const dia of DIAS) {
    const h = horarios[dia.key]
    if (!h.ativo) continue
    if (!h.inicio || !h.fim || h.inicio >= h.fim) {
      return `Horario invalido em ${dia.label}.`
    }
  }

  return null
}

export function InicioPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [quadras, setQuadras] = useState<Quadra[]>([])
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null)
  const [descricao, setDescricao] = useState('')
  const [horariosSemana, setHorariosSemana] = useState<HorariosSemana>(horariosPadrao())
  const [tipo, setTipo] = useState<TipoQuadra>('Vôlei')
  const [loadingQuadras, setLoadingQuadras] = useState(false)
  const [savingQuadra, setSavingQuadra] = useState(false)
  const [editingQuadraId, setEditingQuadraId] = useState<number | string | null>(null)
  const [editDescricao, setEditDescricao] = useState('')
  const [editTipo, setEditTipo] = useState<TipoQuadra>('Vôlei')
  const [editHorariosSemana, setEditHorariosSemana] = useState<HorariosSemana>(horariosPadrao())
  const [savingEdit, setSavingEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dataReservasAdmin, setDataReservasAdmin] = useState(dataHojeBrasilYmd)
  const [reservasDiaAdmin, setReservasDiaAdmin] = useState<ReservaAdminItem[]>([])
  const [loadingReservasAdmin, setLoadingReservasAdmin] = useState(false)
  const [cancelandoReservaId, setCancelandoReservaId] = useState<number | string | null>(null)
  const [reservaPainelError, setReservaPainelError] = useState<string | null>(null)
  const [reservaPainelSuccess, setReservaPainelSuccess] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const metadata = (session?.user.user_metadata ?? {}) as Record<string, unknown>
  const role = String(metadata.role ?? '').toLowerCase()
  const empresaOwner = metadata.empresa_owner === true
  const isAdmin = role === 'admin' || empresaOwner
  const empresa = String(metadata.empresa ?? '').trim()

  async function loadQuadras() {
    if (!session || !isAdmin || !empresa) return
    setLoadingQuadras(true)
    setError(null)

    const { data, error: fetchErr } = await supabase
      .from('quadras')
      .select('id, descricao, horarios, tipo, created_at')
      .eq('empresa', empresa)
      .order('created_at', { ascending: false })

    setLoadingQuadras(false)

    if (fetchErr) {
      setError(
        'Nao foi possivel carregar as quadras da empresa. Verifique se a tabela "quadras" existe no Supabase.',
      )
      return
    }

    setQuadras((data ?? []) as Quadra[])
  }

  async function loadEmpresas() {
    if (!session) return
    setLoadingEmpresas(true)
    setError(null)

    const { data: empresasData, error: empresasErr } = await supabase
      .from('empresas')
      .select('nome')
      .order('nome', { ascending: true })

    if (empresasErr) {
      setLoadingEmpresas(false)
      setError(
        `Nao foi possivel carregar empresas de administradores: ${empresasErr.message}. Crie a tabela "empresas".`,
      )
      return
    }

    const nomes = ((empresasData ?? []) as EmpresaRow[])
      .map((e) => String(e.nome ?? '').trim())
      .filter(Boolean)

    if (nomes.length === 0) {
      setEmpresas([])
      setLoadingEmpresas(false)
      return
    }

    const { data: tiposData, error: tiposErr } = await supabase
      .from('quadras')
      .select('empresa, tipo')
      .in('empresa', nomes)

    setLoadingEmpresas(false)

    if (tiposErr) {
      setError(`Nao foi possivel carregar os tipos de quadra: ${tiposErr.message}`)
      return
    }

    const mapa = new Map<string, Set<TipoQuadra>>()
    for (const nome of nomes) mapa.set(nome, new Set<TipoQuadra>())

    for (const row of (tiposData ?? []) as Array<{ empresa: string; tipo: TipoQuadra }>) {
      const empresaNome = String(row.empresa ?? '').trim()
      if (!empresaNome) continue
      if (!mapa.has(empresaNome)) mapa.set(empresaNome, new Set<TipoQuadra>())
      mapa.get(empresaNome)!.add(row.tipo)
    }

    const lista = Array.from(mapa.entries())
      .map(([nome, tiposSet]) => ({
        nome,
        tipos: Array.from(tiposSet.values()),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    setEmpresas(lista)
  }

  useEffect(() => {
    loadQuadras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, isAdmin, empresa])

  async function loadReservasDiaAdmin(): Promise<ReservaAdminItem[]> {
    if (!session || !isAdmin || !empresa || !dataReservasAdmin) {
      setReservasDiaAdmin([])
      setLoadingReservasAdmin(false)
      return []
    }
    setLoadingReservasAdmin(true)
    setReservaPainelError(null)
    const inicioDia = inicioDiaBrasilIso(dataReservasAdmin)
    const fimExclusivo = fimDiaExclusivoBrasilIso(dataReservasAdmin)
    const { data, error: fetchErr } = await supabase
      .from('reservas')
      .select('id, inicio, fim, quadra_id, user_id')
      .eq('empresa', empresa)
      .gte('inicio', inicioDia)
      .lt('inicio', fimExclusivo)
      .order('inicio', { ascending: true })
    setLoadingReservasAdmin(false)
    if (fetchErr) {
      setReservaPainelError(`Nao foi possivel carregar reservas: ${fetchErr.message}`)
      setReservasDiaAdmin([])
      return []
    }
    const items = (data ?? []) as ReservaAdminItem[]
    setReservasDiaAdmin(items)
    return items
  }

  useEffect(() => {
    if (!isAdmin) return
    void loadReservasDiaAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, isAdmin, empresa, dataReservasAdmin])

  async function cancelarReservaAdmin(reservaId: number | string) {
    if (!empresa) return
    if (!window.confirm('Cancelar esta reserva?')) return
    setReservaPainelError(null)
    setReservaPainelSuccess(null)
    setCancelandoReservaId(reservaId)
    const { data: removidas, error: delErr } = await supabase
      .from('reservas')
      .delete()
      .eq('id', reservaId)
      .eq('empresa', empresa)
      .select('id')
    setCancelandoReservaId(null)
    if (delErr) {
      setReservaPainelError(`Nao foi possivel cancelar: ${delErr.message}`)
      return
    }
    if (removidas?.length) {
      setReservaPainelSuccess('Reserva cancelada.')
      await loadReservasDiaAdmin()
      return
    }
    const listaAtualizada = await loadReservasDiaAdmin()
    const idAlvo = String(reservaId)
    if (!listaAtualizada.some((r) => String(r.id) === idAlvo)) {
      setReservaPainelSuccess('Reserva cancelada.')
      return
    }
    setReservaPainelError(
      'Nao foi possivel cancelar. No Supabase, ative politica RLS de DELETE em reservas para administrador da empresa (supabase/policies_reservas_delete.sql).',
    )
  }

  useEffect(() => {
    if (!session || isAdmin) return
    loadEmpresas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, isAdmin])

  async function handleCreateQuadra(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!session || !isAdmin) {
      setError('Apenas administradores podem cadastrar quadras.')
      return
    }
    if (!empresa) {
      setError('Nao encontramos a empresa vinculada ao seu usuario administrador.')
      return
    }

    const descricaoTrim = descricao.trim()
    if (descricaoTrim.length < 3) {
      setError('Informe uma descricao valida da quadra.')
      return
    }

    const erroHorario = validarHorarios(horariosSemana)
    if (erroHorario) {
      setError(erroHorario)
      return
    }

    setSavingQuadra(true)
    const { error: insertErr } = await supabase.from('quadras').insert({
      identificador: gerarIdentificadorQuadra(),
      descricao: descricaoTrim,
      horarios: horariosSemana,
      tipo,
      empresa,
      owner_id: session.user.id,
    })
    setSavingQuadra(false)

    if (insertErr) {
      setError(
        `Nao foi possivel cadastrar a quadra: ${insertErr.message}`,
      )
      return
    }

    setDescricao('')
    setHorariosSemana(horariosPadrao())
    setTipo('Vôlei')
    setSuccess('Quadra cadastrada com sucesso.')
    await loadQuadras()
  }

  function iniciarEdicao(quadra: Quadra) {
    setError(null)
    setSuccess(null)
    setEditingQuadraId(quadra.id)
    setEditDescricao(quadra.descricao)
    setEditTipo(quadra.tipo)
    setEditHorariosSemana(normalizarHorarios(quadra.horarios))
  }

  function cancelarEdicao() {
    setEditingQuadraId(null)
    setEditDescricao('')
    setEditTipo('Vôlei')
    setEditHorariosSemana(horariosPadrao())
  }

  async function salvarEdicao(id: number | string) {
    setError(null)
    setSuccess(null)

    const descricaoTrim = editDescricao.trim()
    if (descricaoTrim.length < 3) {
      setError('Informe uma descricao valida da quadra.')
      return
    }
    const erroHorario = validarHorarios(editHorariosSemana)
    if (erroHorario) {
      setError(erroHorario)
      return
    }

    setSavingEdit(true)
    const { error: updateErr } = await supabase
      .from('quadras')
      .update({
        descricao: descricaoTrim,
        tipo: editTipo,
        horarios: editHorariosSemana,
      })
      .eq('id', id)
      .eq('empresa', empresa)

    setSavingEdit(false)

    if (updateErr) {
      setError(`Nao foi possivel atualizar a quadra: ${updateErr.message}`)
      return
    }

    cancelarEdicao()
    setSuccess('Quadra atualizada com sucesso.')
    await loadQuadras()
  }

  if (session === undefined) {
    return (
      <div className={styles.layout}>
        <div className={styles.bgPattern} aria-hidden />
        <p className={styles.heroLead} style={{ padding: '2rem', margin: 0 }}>
          Carregando…
        </p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function selecionarEmpresa(nomeEmpresa: string) {
    setEmpresaSelecionada(nomeEmpresa)
    navigate(`/empresa/${encodeURIComponent(nomeEmpresa)}`)
    setError(null)
    setSuccess(null)
  }

  if (isAdmin) {
    return (
      <div className={styles.layout}>
        <div className={styles.bgPattern} aria-hidden />
        <div className={`${styles.shell} ${styles.adminShell}`}>
          <main className={`${styles.panel} ${styles.adminPanel}`}>
            <section className={styles.adminCenterWrap}>
              <div className={`${styles.card} ${styles.adminHeaderCard}`}>
                <div>
                  <h1 className={styles.title}>Empresa: {empresa || 'Nao definida'}</h1>
                  <p className={styles.subtitle}>Logado como administrador ({session.user.email}).</p>
                </div>
                <button
                  type="button"
                  className={`${styles.submit} ${styles.adminSignOut} ${styles.adminSignOutInline}`}
                  onClick={handleSignOut}
                >
                  Sair
                </button>
              </div>

              <div className={styles.adminGrid}>
              <div className={`${styles.card} ${styles.adminCard}`}>
                <h2 className={styles.title}>Cadastrar quadra</h2>
                <p className={styles.subtitle}>
                  O ID e automatico. Informe descricao, tipo e horarios por dia.
                </p>

                <form className={styles.form} onSubmit={handleCreateQuadra} noValidate>
                  {error ? <p className={styles.formError}>{error}</p> : null}
                  {success ? <p className={styles.formSuccess}>{success}</p> : null}

                  <label className={styles.field}>
                    <span className={styles.label}>Descricao</span>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Ex: Quadra coberta, piso emborrachado"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      required
                    />
                  </label>

                  <div className={styles.field}>
                    <span className={styles.label}>Horarios por dia</span>
                    <div className={styles.adminScheduleList}>
                      {DIAS.map((dia) => {
                        const h = horariosSemana[dia.key]
                        return (
                          <div key={dia.key} className={styles.adminScheduleRow}>
                            <label className={styles.checkbox}>
                              <input
                                type="checkbox"
                                checked={h.ativo}
                                onChange={(e) =>
                                  setHorariosSemana((prev) => ({
                                    ...prev,
                                    [dia.key]: { ...prev[dia.key], ativo: e.target.checked },
                                  }))
                                }
                              />
                              {dia.label}
                            </label>
                            <div className={styles.adminScheduleTimes}>
                              <input
                                className={styles.input}
                                type="time"
                                value={h.inicio}
                                onChange={(e) =>
                                  setHorariosSemana((prev) => ({
                                    ...prev,
                                    [dia.key]: { ...prev[dia.key], inicio: e.target.value },
                                  }))
                                }
                                disabled={!h.ativo}
                              />
                              <input
                                className={styles.input}
                                type="time"
                                value={h.fim}
                                onChange={(e) =>
                                  setHorariosSemana((prev) => ({
                                    ...prev,
                                    [dia.key]: { ...prev[dia.key], fim: e.target.value },
                                  }))
                                }
                                disabled={!h.ativo}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.label}>Tipo de quadra</span>
                    <select
                      className={styles.input}
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoQuadra)}
                    >
                      <option value="Vôlei">Vôlei</option>
                      <option value="Basquete">Basquete</option>
                      <option value="Beach Tennis">Beach Tennis</option>
                    </select>
                  </label>

                  <button type="submit" className={styles.submit} disabled={savingQuadra}>
                    {savingQuadra ? 'Salvando...' : 'Cadastrar quadra'}
                  </button>
                </form>
              </div>

              <div className={`${styles.card} ${styles.adminCard}`}>
                <h2 className={styles.title}>Quadras cadastradas</h2>
                {loadingQuadras ? (
                  <p className={styles.subtitle}>Carregando quadras...</p>
                ) : quadras.length === 0 ? (
                  <p className={styles.subtitle}>Nenhuma quadra cadastrada ainda.</p>
                ) : (
                  <div className={styles.adminQuadraList}>
                    {quadras.map((quadra) => (
                      <article key={quadra.id} className={styles.adminQuadraItem}>
                        <div className={styles.adminQuadraHeader}>
                          <p className={styles.subtitle}>
                            <strong>Quadra cadastrada</strong>
                          </p>
                          <span className={styles.adminBadge}>{quadra.tipo}</span>
                        </div>

                        {editingQuadraId === quadra.id ? (
                          <div className={styles.form}>
                            <label className={styles.field}>
                              <span className={styles.label}>Descricao</span>
                              <input
                                className={styles.input}
                                type="text"
                                value={editDescricao}
                                onChange={(e) => setEditDescricao(e.target.value)}
                              />
                            </label>

                            <label className={styles.field}>
                              <span className={styles.label}>Tipo de quadra</span>
                              <select
                                className={styles.input}
                                value={editTipo}
                                onChange={(e) => setEditTipo(e.target.value as TipoQuadra)}
                              >
                                <option value="Vôlei">Vôlei</option>
                                <option value="Basquete">Basquete</option>
                                <option value="Beach Tennis">Beach Tennis</option>
                              </select>
                            </label>

                            <div className={styles.field}>
                              <span className={styles.label}>Horarios por dia</span>
                              <div className={styles.adminScheduleList}>
                                {DIAS.map((dia) => {
                                  const h = editHorariosSemana[dia.key]
                                  return (
                                    <div key={`edit-${quadra.id}-${dia.key}`} className={styles.adminScheduleRow}>
                                      <label className={styles.checkbox}>
                                        <input
                                          type="checkbox"
                                          checked={h.ativo}
                                          onChange={(e) =>
                                            setEditHorariosSemana((prev) => ({
                                              ...prev,
                                              [dia.key]: { ...prev[dia.key], ativo: e.target.checked },
                                            }))
                                          }
                                        />
                                        {dia.label}
                                      </label>
                                      <div className={styles.adminScheduleTimes}>
                                        <input
                                          className={styles.input}
                                          type="time"
                                          value={h.inicio}
                                          onChange={(e) =>
                                            setEditHorariosSemana((prev) => ({
                                              ...prev,
                                              [dia.key]: { ...prev[dia.key], inicio: e.target.value },
                                            }))
                                          }
                                          disabled={!h.ativo}
                                        />
                                        <input
                                          className={styles.input}
                                          type="time"
                                          value={h.fim}
                                          onChange={(e) =>
                                            setEditHorariosSemana((prev) => ({
                                              ...prev,
                                              [dia.key]: { ...prev[dia.key], fim: e.target.value },
                                            }))
                                          }
                                          disabled={!h.ativo}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            <div className={styles.adminActions}>
                              <button
                                type="button"
                                className={`${styles.submit} ${styles.adminActionBtn}`}
                                onClick={() => salvarEdicao(quadra.id)}
                                disabled={savingEdit}
                              >
                                {savingEdit ? 'Salvando...' : 'Salvar alteracoes'}
                              </button>
                              <button
                                type="button"
                                className={`${styles.submit} ${styles.adminActionBtn} ${styles.adminActionBtnGhost}`}
                                onClick={cancelarEdicao}
                                disabled={savingEdit}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
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
                            <div className={styles.adminActions}>
                              <button
                                type="button"
                                className={`${styles.submit} ${styles.adminActionBtn}`}
                                onClick={() => iniciarEdicao(quadra)}
                              >
                                Editar
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
              </div>

              <div className={`${styles.card} ${styles.adminCard}`} style={{ marginTop: '0.75rem' }}>
                <h2 className={styles.title}>Reservas do dia</h2>
                <p className={styles.subtitle}>
                  Visualize e cancele reservas de qualquer usuario da sua empresa.
                </p>
                <label className={styles.field}>
                  <span className={styles.label}>Data</span>
                  <input
                    className={styles.input}
                    type="date"
                    value={dataReservasAdmin}
                    onChange={(e) => setDataReservasAdmin(e.target.value)}
                  />
                </label>
                <div style={{ marginTop: '0.65rem' }}>
                  <button
                    type="button"
                    className={`${styles.submit} ${styles.adminActionBtn}`}
                    onClick={() => void loadReservasDiaAdmin()}
                    disabled={loadingReservasAdmin}
                  >
                    {loadingReservasAdmin ? 'Atualizando...' : 'Atualizar lista'}
                  </button>
                </div>
                {reservaPainelError ? <p className={styles.formError}>{reservaPainelError}</p> : null}
                {reservaPainelSuccess ? <p className={styles.formSuccess}>{reservaPainelSuccess}</p> : null}
                {loadingReservasAdmin ? (
                  <p className={styles.subtitle} style={{ marginTop: '0.75rem' }}>
                    Carregando reservas...
                  </p>
                ) : reservasDiaAdmin.length === 0 ? (
                  <p className={styles.subtitle} style={{ marginTop: '0.75rem' }}>
                    Nenhuma reserva nesta data.
                  </p>
                ) : (
                  <div className={styles.adminQuadraList} style={{ marginTop: '0.75rem' }}>
                    {reservasDiaAdmin.map((r) => {
                      const q = quadras.find((quad) => String(quad.id) === String(r.quadra_id))
                      const tituloQuadra = q ? `${q.tipo} — ${q.descricao}` : `Quadra #${r.quadra_id}`
                      return (
                        <article key={r.id} className={styles.adminQuadraItem}>
                          <div className={styles.adminReservaLinha}>
                            <div>
                              <p className={styles.subtitle} style={{ margin: 0 }}>
                                <strong>
                                  {formatarHoraBrasil(r.inicio)} - {formatarHoraBrasil(r.fim)}
                                </strong>
                              </p>
                              <p className={styles.subtitle} style={{ margin: '0.25rem 0 0' }}>
                                {tituloQuadra}
                              </p>
                            </div>
                            <button
                              type="button"
                              className={`${styles.submit} ${styles.adminActionBtn} ${styles.adminActionBtnGhost}`}
                              disabled={cancelandoReservaId === r.id}
                              onClick={() => void cancelarReservaAdmin(r.id)}
                            >
                              {cancelandoReservaId === r.id ? 'Cancelando...' : 'Cancelar reserva'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <div className={styles.bgPattern} aria-hidden />
      <div className={`${styles.shell} ${styles.userHomeShell}`}>
        <main className={`${styles.panel} ${styles.userHomePanel}`}>
          <section className={styles.userHomeWrap}>
            <div className={`${styles.card} ${styles.userHomeHeader}`}>
              <div>
                <h1 className={styles.title}>Escolha uma empresa</h1>
                <p className={styles.subtitle}>
                  Logado como {session.user.email}. Selecione uma empresa para reservar quadra.
                </p>
              </div>
              <button
                type="button"
                className={`${styles.submit} ${styles.adminSignOut} ${styles.adminSignOutInline}`}
                onClick={handleSignOut}
              >
                Sair
              </button>
            </div>

            {error ? <p className={styles.formError}>{error}</p> : null}
            {success ? <p className={styles.formSuccess}>{success}</p> : null}

            {loadingEmpresas ? (
              <div className={styles.card}>
                <p className={styles.subtitle}>Carregando empresas...</p>
              </div>
            ) : empresas.length === 0 ? (
              <div className={styles.card}>
                <h2 className={styles.title}>Nenhuma empresa encontrada</h2>
                <p className={styles.subtitle}>
                  Ainda nao existem quadras cadastradas para exibicao.
                </p>
              </div>
            ) : (
              <div className={styles.companyGrid}>
                {empresas.map((empresaItem) => (
                  <article
                    key={empresaItem.nome}
                    className={`${styles.card} ${styles.companyCard} ${
                      empresaSelecionada === empresaItem.nome ? styles.companyCardSelected : ''
                    }`}
                  >
                    <h2 className={styles.title}>{empresaItem.nome}</h2>
                    <div className={styles.companyTypes}>
                      {empresaItem.tipos.length ? (
                        empresaItem.tipos.map((tipoItem) => (
                          <span key={`${empresaItem.nome}-${tipoItem}`} className={styles.adminBadge}>
                            {tipoItem}
                          </span>
                        ))
                      ) : (
                        <span className={styles.subtitle}>Sem quadras cadastradas ainda</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`${styles.submit} ${styles.companyActionBtn}`}
                      onClick={() => selecionarEmpresa(empresaItem.nome)}
                    >
                      Escolher empresa
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
