import type { Alerta, Caso, CasoCalculado, Catalogos } from './tipos'

// Las fechas se manejan como texto YYYY-MM-DD y se operan como número de día (UTC)
// para que la zona horaria del teléfono no mueva los vencimientos.
const DIA = 86_400_000

export function aDia(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DIA)
}

export function deDia(n: number) {
  return new Date(n * DIA).toISOString().slice(0, 10)
}

export function hoyISO() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 0 = domingo ... 6 = sábado */
export function diaSemana(n: number) {
  return (n + 4) % 7 // 1970-01-01 fue jueves
}

export const esFinDeSemana = (n: number) => {
  const d = diaSemana(n)
  return d === 0 || d === 6
}

export function sumarHabiles(iso: string, dias: number, feriados: Set<string> = new Set()) {
  let n = aDia(iso)
  let quedan = dias
  while (quedan > 0) {
    n++
    if (!esFinDeSemana(n) && !feriados.has(deDia(n))) quedan--
  }
  return deDia(n)
}

/** Primer día laborable igual o posterior a la fecha. */
export function laborableDesde(n: number, feriados: Set<string>) {
  while (esFinDeSemana(n) || feriados.has(deDia(n))) n++
  return n
}

export function lunesDe(iso: string) {
  const n = aDia(iso)
  return deDia(n - ((diaSemana(n) + 6) % 7))
}

/**
 * Vencimiento = inicio de etapa + plazo. Calificación cuenta días hábiles (lunes a
 * viernes), igual que el reporte de plazos fiscales; las demás etapas, días calendario.
 */
export function vencimiento(c: Pick<Caso, 'fecha_inicio_etapa' | 'plazo_dias' | 'tipo_dias'>) {
  if (!c.plazo_dias) return null
  if (c.tipo_dias === 'habiles') return sumarHabiles(c.fecha_inicio_etapa, c.plazo_dias)
  return deDia(aDia(c.fecha_inicio_etapa) + c.plazo_dias)
}

export function calcular(c: Caso, cat: Catalogos, hoy: string, umbral: number): CasoCalculado {
  const final = cat.etapas.find((e) => e.codigo === c.etapa)?.final ?? false
  const venc = final ? null : vencimiento(c)
  const dias = venc ? aDia(venc) - aDia(hoy) : null
  let alerta: Alerta = 'concluido'
  if (!final) {
    if (dias === null) alerta = 'en_plazo'
    else if (dias < 0) alerta = 'vencido'
    else if (dias <= umbral) alerta = 'por_vencer'
    else alerta = 'en_plazo'
  }
  return { ...c, vencimiento: venc, dias_restantes: dias, alerta }
}

/** Prioridad: vencidos primero (el más atrasado arriba), luego por días que faltan. */
export function compararPrioridad(a: CasoCalculado, b: CasoCalculado) {
  const pa = a.alerta === 'concluido' ? 1 : 0
  const pb = b.alerta === 'concluido' ? 1 : 0
  if (pa !== pb) return pa - pb
  return (a.dias_restantes ?? 1e9) - (b.dias_restantes ?? 1e9)
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

export function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function fmtCorto(iso: string | null | undefined) {
  if (!iso) return '—'
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)} ${MESES[Number(m) - 1]}`
}

export function fmtFechaHora(ts: string) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function textoDias(dias: number | null) {
  if (dias === null) return 'sin plazo'
  if (dias < 0) return `${-dias} d vencido`
  if (dias === 0) return 'vence hoy'
  return `faltan ${dias} d`
}
