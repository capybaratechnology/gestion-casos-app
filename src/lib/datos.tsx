import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CATALOGOS_DEFECTO } from './etapas'
import { calcular, compararPrioridad, hoyISO } from './fechas'
import { mensajeError, type Repo } from './repo'
import { crearRepoDemo } from './repoDemo'
import { crearRepoSupabase } from './repoSupabase'
import type { CambioEtapa, Caso, CasoCalculado, Catalogos, Fiscal, Perfil, PlanCaso } from './tipos'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const repo: Repo = URL && CLAVE ? crearRepoSupabase(URL, CLAVE) : crearRepoDemo()

function preferencia<T>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave)
    return v === null ? defecto : (JSON.parse(v) as T)
  } catch {
    return defecto
  }
}

function recordar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    /* nada */
  }
}

interface Datos {
  repo: Repo
  cargando: boolean
  error: string | null
  perfil: Perfil | null
  catalogos: Catalogos
  fiscales: Fiscal[]
  perfiles: Perfil[]
  casos: CasoCalculado[]
  hoy: string
  umbral: number
  setUmbral(n: number): void
  fiscalFiltro: string
  setFiscalFiltro(id: string): void
  puedeCambiarEtapa: boolean
  recargar(): Promise<void>
  actualizarCaso(id: string, cambios: Partial<Caso>): Promise<void>
  cambiarEtapa(id: string, c: CambioEtapa): Promise<void>
  agregarNota(id: string, nota: string): Promise<void>
  guardarPlan(plan: PlanCaso[]): Promise<void>
  aviso: string | null
  avisar(m: string): void
}

const Ctx = createContext<Datos | null>(null)

export function useDatos() {
  const d = useContext(Ctx)
  if (!d) throw new Error('useDatos fuera de DatosProvider')
  return d
}

export function DatosProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [catalogos, setCatalogos] = useState<Catalogos>(CATALOGOS_DEFECTO)
  const [fiscales, setFiscales] = useState<Fiscal[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [casosBase, setCasosBase] = useState<Caso[]>([])
  const [umbral, setUmbralState] = useState(() => preferencia('gc-umbral', 10))
  const [fiscalFiltro, setFiltroState] = useState(() => preferencia('gc-fiscal', ''))
  const [aviso, setAviso] = useState<string | null>(null)
  const [hoy, setHoy] = useState(hoyISO)

  const avisar = useCallback((m: string) => {
    setAviso(m)
    window.setTimeout(() => setAviso((a) => (a === m ? null : a)), 3500)
  }, [])

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const p = await repo.perfilActual()
      setPerfil(p)
      if (p) {
        const [cat, fis, per, cs] = await Promise.all([repo.catalogos(), repo.fiscales(), repo.perfiles(), repo.casos()])
        setCatalogos(cat)
        setFiscales(fis)
        setPerfiles(per)
        setCasosBase(cs)
      } else {
        setCasosBase([])
      }
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
      setHoy(hoyISO())
    }
  }, [])

  useEffect(() => {
    recargar()
    return repo.alCambiarSesion(() => recargar())
  }, [recargar])

  // Cambios de otros usuarios en tiempo real (solo Supabase)
  useEffect(() => {
    if (!perfil) return
    return repo.escucharCasos((c) => setCasosBase((cs) => cs.map((x) => (x.id === c.id ? c : x))))
  }, [perfil])

  const casos = useMemo(
    () => casosBase.map((c) => calcular(c, catalogos, hoy, umbral)).sort(compararPrioridad),
    [casosBase, catalogos, hoy, umbral],
  )

  const reemplazar = (c: Caso) => setCasosBase((cs) => cs.map((x) => (x.id === c.id ? c : x)))

  const valor: Datos = {
    repo,
    cargando,
    error,
    perfil,
    catalogos,
    fiscales,
    perfiles,
    casos,
    hoy,
    umbral,
    setUmbral(n) {
      setUmbralState(n)
      recordar('gc-umbral', n)
    },
    fiscalFiltro: perfil?.rol === 'admin' ? fiscalFiltro : (perfil?.fiscal_id ?? ''),
    setFiscalFiltro(id) {
      setFiltroState(id)
      recordar('gc-fiscal', id)
    },
    puedeCambiarEtapa: perfil?.rol === 'admin' || perfil?.rol === 'fiscal',
    recargar,
    async actualizarCaso(id, cambios) {
      const previo = casosBase.find((c) => c.id === id)
      if (previo) reemplazar({ ...previo, ...cambios }) // optimista
      try {
        reemplazar(await repo.actualizarCaso(id, cambios))
      } catch (e) {
        if (previo) reemplazar(previo)
        avisar(`No se guardó: ${mensajeError(e)}`)
        throw e
      }
    },
    async cambiarEtapa(id, c) {
      reemplazar(await repo.cambiarEtapa(id, c))
      avisar('Etapa actualizada')
    },
    async agregarNota(id, nota) {
      await repo.agregarNota(id, nota)
    },
    async guardarPlan(plan) {
      await repo.guardarPlan(plan)
      const porId = new Map(plan.map((p) => [p.id, p]))
      setCasosBase((cs) => cs.map((c) => (porId.has(c.id) ? { ...c, ...porId.get(c.id) } : c)))
      avisar(`Plan guardado (${plan.length} casos)`)
    },
    aviso,
    avisar,
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

/** Casos visibles según el fiscal elegido (admin) o el despacho del usuario. */
export function useCasosFiltrados() {
  const { casos, fiscalFiltro } = useDatos()
  return useMemo(() => (fiscalFiltro ? casos.filter((c) => c.fiscal_id === fiscalFiltro) : casos), [casos, fiscalFiltro])
}
