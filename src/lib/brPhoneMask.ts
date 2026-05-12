/** Apenas digitos, ate 11 posicoes (DDD + celular BR). */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '').slice(0, 11)
}

/**
 * Mascara (XX) XXXXX-XXXX para 11 digitos ou (XX) XXXX-XXXX para 10 digitos.
 */
export function formatCelularBrFromDigits(digits: string): string {
  const raw = onlyDigits(digits)
  if (!raw) return ''
  const dd = raw.slice(0, 2)
  const rest = raw.slice(2)
  if (raw.length <= 2) return `(${dd}`
  if (rest.length <= 4) return `(${dd}) ${rest}`
  if (rest.length <= 8) return `(${dd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${dd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`
}
