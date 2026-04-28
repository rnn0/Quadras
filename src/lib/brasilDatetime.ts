/**
 * Reservas usam horário de Brasília (sem horário de verão desde 2019).
 * Timestamps sem fuso no Postgres costumam ser tratados como UTC, o que
 * desloca 3h na exibição local — por isso sempre enviamos offset explícito.
 */
export const TZ_BRASILIA = 'America/Sao_Paulo'

const OFFSET_BR = '-03:00'

export function montarIsoReservaBrasil(dataYmd: string, horaHhmm: string): string {
  const comSegundos = horaHhmm.length === 5 ? `${horaHhmm}:00` : horaHhmm
  return `${dataYmd}T${comSegundos}${OFFSET_BR}`
}

export function inicioDiaBrasilIso(dataYmd: string): string {
  return `${dataYmd}T00:00:00${OFFSET_BR}`
}

export function proximoDiaYmd(dataYmd: string): string {
  const [y, m, d] = dataYmd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 1)
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(dt.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

/** Início do dia seguinte em Brasília (para usar com .lt no filtro do dia). */
export function fimDiaExclusivoBrasilIso(dataYmd: string): string {
  return `${proximoDiaYmd(dataYmd)}T00:00:00${OFFSET_BR}`
}

export function formatarHoraBrasil(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_BRASILIA,
  })
}

/** Data civil atual em Brasília (YYYY-MM-DD). */
export function dataHojeBrasilYmd(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ_BRASILIA })
}
