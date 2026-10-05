import type { Avance, Catalogos, Etapa, Transicion } from './tipos'

// Valores por defecto; en modo Supabase se leen de las tablas etapas/transiciones/feriados.
export const ETAPAS: Etapa[] = [
  { codigo: 'CALIFICACION', nombre: 'Calificación', orden: 1, plazo_defecto: 2, tipo_dias: 'habiles', horas_preparacion: 3, final: false },
  { codigo: 'INVESTIGACION PRELIMINAR', nombre: 'Investigación preliminar', orden: 2, plazo_defecto: 60, tipo_dias: 'calendario', horas_preparacion: 10, final: false },
  { codigo: 'INVESTIGACION PREPARATORIA', nombre: 'Investigación preparatoria', orden: 3, plazo_defecto: 120, tipo_dias: 'calendario', horas_preparacion: 12, final: false },
  { codigo: 'ACUSACION', nombre: 'Acusación', orden: 4, plazo_defecto: null, tipo_dias: 'calendario', horas_preparacion: null, final: true },
  { codigo: 'SOBRESEIMIENTO', nombre: 'Sobreseimiento', orden: 4, plazo_defecto: null, tipo_dias: 'calendario', horas_preparacion: null, final: true },
  { codigo: 'ARCHIVO', nombre: 'Archivo', orden: 4, plazo_defecto: null, tipo_dias: 'calendario', horas_preparacion: null, final: true },
]

export const TRANSICIONES: Transicion[] = [
  { origen: 'CALIFICACION', destino: 'INVESTIGACION PRELIMINAR', documento: 'Disposición de apertura de investigación preliminar', horas_min: 3, horas_max: 3 },
  { origen: 'CALIFICACION', destino: 'ARCHIVO', documento: 'Disposición de archivo', horas_min: 2, horas_max: 2 },
  { origen: 'INVESTIGACION PRELIMINAR', destino: 'INVESTIGACION PREPARATORIA', documento: 'Disposición de formalización de investigación preparatoria', horas_min: 8, horas_max: 12 },
  { origen: 'INVESTIGACION PREPARATORIA', destino: 'ACUSACION', documento: 'Requerimiento de acusación', horas_min: 8, horas_max: 16 },
  { origen: 'INVESTIGACION PREPARATORIA', destino: 'SOBRESEIMIENTO', documento: 'Requerimiento de sobreseimiento', horas_min: 8, horas_max: 8 },
]

export const FERIADOS = [
  { fecha: '2026-10-08', descripcion: 'Combate de Angamos' },
  { fecha: '2026-11-01', descripcion: 'Todos los Santos' },
  { fecha: '2026-12-08', descripcion: 'Inmaculada Concepción' },
  { fecha: '2026-12-09', descripcion: 'Batalla de Ayacucho' },
  { fecha: '2026-12-25', descripcion: 'Navidad' },
  { fecha: '2027-01-01', descripcion: 'Año Nuevo' },
]

export const CATALOGOS_DEFECTO: Catalogos = { etapas: ETAPAS, transiciones: TRANSICIONES, feriados: FERIADOS }

// Estados del sistema fiscal que suelen acompañar a cada etapa (se puede escribir otro).
export const ESTADOS_SUGERIDOS: Record<string, string[]> = {
  CALIFICACION: ['EN CALIFICACION (CALIFICA)'],
  'INVESTIGACION PRELIMINAR': ['ASIGNADO PNP (PRELIMINAR)', 'CON INVESTIGACION PRELIMINAR'],
  'INVESTIGACION PREPARATORIA': ['FORMALIZA INVESTIGACION PREPARATORIA', 'CONCLUSION INV. PREPARATORIA'],
  ACUSACION: ['REQUERIMIENTO DE ACUSACION'],
  SOBRESEIMIENTO: ['REQUERIMIENTO DE SOBRESEIMIENTO'],
  ARCHIVO: ['ARCHIVADO'],
}

export const AVANCES: { valor: Avance; nombre: string }[] = [
  { valor: 'pendiente', nombre: 'Pendiente' },
  { valor: 'en_proceso', nombre: 'En proceso' },
  { valor: 'listo', nombre: 'Documento listo' },
]

export const nombreAvance = (a: Avance) => AVANCES.find((x) => x.valor === a)?.nombre ?? a

export function nombreEtapa(cat: Catalogos, codigo: string) {
  return cat.etapas.find((e) => e.codigo === codigo)?.nombre ?? codigo
}

export function etapaDe(cat: Catalogos, codigo: string) {
  return cat.etapas.find((e) => e.codigo === codigo)
}

export function siguientes(cat: Catalogos, codigo: string) {
  return cat.transiciones.filter((t) => t.origen === codigo)
}

/** Texto corto del documento que corresponde preparar en la etapa actual. */
export function documentoPendiente(cat: Catalogos, codigo: string) {
  const ts = siguientes(cat, codigo)
  if (!ts.length) return null
  return ts
    .map((t) => {
      const h = t.horas_min === t.horas_max ? `${t.horas_min} h` : `${t.horas_min}-${t.horas_max} h`
      return `${nombreEtapa(cat, t.destino)} (${h})`
    })
    .join(' o ')
}
