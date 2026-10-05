import demo from '../data/demo.json'
import { CATALOGOS_DEFECTO, etapaDe } from './etapas'
import type { Repo } from './repo'
import type { Caso, Fiscal, Movimiento, Perfil } from './tipos'

// Modo demo: los datos viven en este navegador (localStorage). Sirve para probar la
// app sin Supabase; cada dispositivo tiene su propia copia.
const CLAVE = 'gc-demo-v1'
const NOE = '11111111-1111-4111-8111-111111111111'
const DAVID = '22222222-2222-4222-8222-222222222222'

export const USUARIOS_DEMO: Perfil[] = [
  { id: 'demo-admin', nombre: 'Coordinación (admin)', rol: 'admin', fiscal_id: null },
  { id: 'demo-noe', nombre: 'Noé García Vera', rol: 'fiscal', fiscal_id: NOE },
  { id: 'demo-noe-a1', nombre: 'Asistente 1 · Noé', rol: 'asistente', fiscal_id: NOE },
  { id: 'demo-noe-a2', nombre: 'Asistente 2 · Noé', rol: 'asistente', fiscal_id: NOE },
  { id: 'demo-david', nombre: 'David Villanueva Flores', rol: 'fiscal', fiscal_id: DAVID },
  { id: 'demo-david-a1', nombre: 'Asistente 1 · David', rol: 'asistente', fiscal_id: DAVID },
  { id: 'demo-david-a2', nombre: 'Asistente 2 · David', rol: 'asistente', fiscal_id: DAVID },
]

interface Estado {
  usuario: string | null
  perfiles: Perfil[]
  casos: Caso[]
  movimientos: Movimiento[]
}

function inicial(): Estado {
  const casos = (demo.casos as Omit<Caso, 'id' | 'avance' | 'responsable_id' | 'notas'>[]).map((c, i) => ({
    ...c,
    id: `c${i + 1}`,
    avance: 'pendiente' as const,
    responsable_id: null,
    notas: null,
  }))
  return { usuario: null, perfiles: USUARIOS_DEMO, casos, movimientos: [] }
}

function leer(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (raw) return JSON.parse(raw) as Estado
  } catch {
    /* sin almacenamiento: se usa estado en memoria */
  }
  return inicial()
}

let memoria: Estado | null = null
const estado = () => (memoria ??= leer())

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(memoria))
  } catch {
    /* sigue en memoria */
  }
}

const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

function registrar(caso_id: string, tipo: Movimiento['tipo'], antes: string | null, despues: string | null, nota: string | null = null) {
  const e = estado()
  e.movimientos.unshift({
    id: `${Date.now()}-${Math.random()}`,
    caso_id,
    tipo,
    valor_anterior: antes,
    valor_nuevo: despues,
    nota,
    creado_por: e.usuario,
    creado_en: new Date().toISOString(),
  })
}

function usuarioActual() {
  const e = estado()
  return e.perfiles.find((p) => p.id === e.usuario) ?? null
}

function visibles() {
  const u = usuarioActual()
  if (!u) return []
  return estado().casos.filter((c) => u.rol === 'admin' || c.fiscal_id === u.fiscal_id)
}

function buscar(id: string) {
  const c = visibles().find((x) => x.id === id)
  if (!c) throw new Error('Caso no encontrado o sin permiso')
  return c
}

export function reiniciarDemo() {
  memoria = inicial()
  guardar()
  avisar()
}

export function entrarDemo(id: string) {
  estado().usuario = id
  guardar()
  avisar()
}

export function crearRepoDemo(): Repo {
  return {
    modo: 'demo',
    perfilActual: async () => usuarioActual(),
    alCambiarSesion(cb) {
      oyentes.add(cb)
      return () => oyentes.delete(cb)
    },
    async entrar() {
      throw new Error('En modo demo elige un usuario de la lista')
    },
    async salir() {
      estado().usuario = null
      guardar()
      avisar()
    },
    catalogos: async () => CATALOGOS_DEFECTO,
    fiscales: async () => demo.fiscales as Fiscal[],
    perfiles: async () => estado().perfiles,
    casos: async () => structuredClone(visibles()),
    async historial(casoId) {
      const e = estado()
      return e.movimientos
        .filter((m) => m.caso_id === casoId)
        .map((m) => ({ ...m, autor: e.perfiles.find((p) => p.id === m.creado_por)?.nombre ?? null }))
    },
    async actualizarCaso(id, cambios) {
      const c = buscar(id)
      if ('etapa' in cambios && cambios.etapa !== c.etapa) throw new Error('La etapa solo se cambia con “Cambiar etapa”')
      const e = estado()
      if (cambios.estado !== undefined && cambios.estado !== c.estado) registrar(id, 'estado', c.estado, cambios.estado)
      if (cambios.avance !== undefined && cambios.avance !== c.avance) registrar(id, 'avance', c.avance, cambios.avance)
      if (cambios.responsable_id !== undefined && cambios.responsable_id !== c.responsable_id) {
        const nom = (pid: string | null) => e.perfiles.find((p) => p.id === pid)?.nombre ?? null
        registrar(id, 'responsable', nom(c.responsable_id), nom(cambios.responsable_id))
      }
      Object.assign(c, cambios, { actualizado_en: new Date().toISOString() })
      guardar()
      return structuredClone(c)
    },
    async cambiarEtapa(id, cambio) {
      const u = usuarioActual()
      if (!u || u.rol === 'asistente') throw new Error('Solo el fiscal o un admin pueden cambiar la etapa')
      const c = buscar(id)
      const ok = CATALOGOS_DEFECTO.transiciones.some((t) => t.origen === c.etapa && t.destino === cambio.etapa)
      if (!ok) throw new Error(`Transición no permitida: ${c.etapa} -> ${cambio.etapa}`)
      const et = etapaDe(CATALOGOS_DEFECTO, cambio.etapa)!
      registrar(id, 'etapa', c.etapa, cambio.etapa, cambio.nota || null)
      Object.assign(c, {
        etapa: cambio.etapa,
        estado: cambio.estado,
        fecha_inicio_etapa: cambio.fecha_inicio,
        plazo_dias: cambio.plazo ?? et.plazo_defecto,
        tipo_dias: et.tipo_dias,
        avance: 'pendiente',
        horas_estimadas: et.horas_preparacion,
        plan_inicio: null,
        plan_fin: null,
        plan_orden: null,
        actualizado_en: new Date().toISOString(),
      })
      guardar()
      return structuredClone(c)
    },
    async agregarNota(casoId, nota) {
      buscar(casoId)
      registrar(casoId, 'nota', null, null, nota)
      guardar()
    },
    async guardarPlan(plan) {
      for (const p of plan) Object.assign(buscar(p.id), p)
      guardar()
    },
    async actualizarPerfil(id, cambios) {
      const p = estado().perfiles.find((x) => x.id === id)
      if (p) Object.assign(p, cambios)
      guardar()
    },
    escucharCasos: () => () => {},
  }
}
