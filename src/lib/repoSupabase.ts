import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CATALOGOS_DEFECTO } from './etapas'
import type { Repo } from './repo'
import type { Caso, Perfil } from './tipos'

const CACHE = 'gc-cache-v1'

function leerCache<T>(clave: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE}:${clave}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function guardarCache(clave: string, valor: unknown) {
  try {
    localStorage.setItem(`${CACHE}:${clave}`, JSON.stringify(valor))
  } catch {
    /* sin espacio o modo privado: se sigue sin caché */
  }
}

/** Lee de Supabase y guarda copia local; sin conexión devuelve la última copia. */
async function conCache<T>(clave: string, leer: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  try {
    const { data, error } = await leer()
    if (error) throw error
    guardarCache(clave, data)
    return data as T
  } catch (e) {
    const copia = leerCache<T>(clave)
    if (copia && !navigator.onLine) return copia
    throw e
  }
}

export function crearRepoSupabase(url: string, clave: string): Repo {
  const sb: SupabaseClient = createClient(url, clave)

  const uid = async () => (await sb.auth.getSession()).data.session?.user.id ?? null

  return {
    modo: 'supabase',

    async perfilActual() {
      const id = await uid()
      if (!id) return null
      return conCache<Perfil>('perfil', () => sb.from('perfiles').select('*').eq('id', id).single())
    },

    alCambiarSesion(cb) {
      const { data } = sb.auth.onAuthStateChange(() => cb())
      return () => data.subscription.unsubscribe()
    },

    async entrar(email, clave) {
      const { error } = await sb.auth.signInWithPassword({ email, password: clave })
      if (error) throw error
    },

    async salir() {
      await sb.auth.signOut()
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(CACHE))
          .forEach((k) => localStorage.removeItem(k))
      } catch {
        /* nada */
      }
    },

    async catalogos() {
      try {
        const [e, t, f] = await Promise.all([
          sb.from('etapas').select('*').order('orden'),
          sb.from('transiciones').select('*'),
          sb.from('feriados').select('*').order('fecha'),
        ])
        if (e.error || t.error || f.error) throw e.error ?? t.error ?? f.error
        const cat = { etapas: e.data, transiciones: t.data, feriados: f.data }
        guardarCache('catalogos', cat)
        return cat
      } catch {
        return leerCache('catalogos') ?? CATALOGOS_DEFECTO
      }
    },

    fiscales: () => conCache('fiscales', () => sb.from('fiscales').select('*').order('nombre')),

    perfiles: () => conCache('perfiles', () => sb.from('perfiles').select('*').order('nombre')),

    casos: () => conCache('casos', () => sb.from('casos').select('*').order('plan_orden', { nullsFirst: false })),

    async historial(casoId) {
      const { data, error } = await sb
        .from('movimientos')
        .select('*, perfiles(nombre)')
        .eq('caso_id', casoId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return (data ?? []).map((m) => ({ ...m, autor: (m.perfiles as { nombre?: string } | null)?.nombre ?? null }))
    },

    async actualizarCaso(id, cambios) {
      const { data, error } = await sb.from('casos').update(cambios).eq('id', id).select().single()
      if (error) throw error
      return data as Caso
    },

    async cambiarEtapa(id, c) {
      const { data, error } = await sb.rpc('cambiar_etapa', {
        p_caso: id,
        p_etapa: c.etapa,
        p_estado: c.estado,
        p_fecha_inicio: c.fecha_inicio,
        p_plazo: c.plazo,
        p_nota: c.nota || null,
      })
      if (error) throw error
      return data as Caso
    },

    async agregarNota(casoId, nota) {
      const { error } = await sb.from('movimientos').insert({ caso_id: casoId, tipo: 'nota', nota, creado_por: await uid() })
      if (error) throw error
    },

    async guardarPlan(plan) {
      const { error } = await sb.rpc('guardar_plan', { p_plan: plan })
      if (error) throw error
    },

    async actualizarPerfil(id, cambios) {
      const { error } = await sb.from('perfiles').update(cambios).eq('id', id)
      if (error) throw error
    },

    escucharCasos(cb) {
      const canal = sb
        .channel('casos')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'casos' }, (p) => cb(p.new as Caso))
        .subscribe()
      return () => {
        sb.removeChannel(canal)
      }
    },
  }
}
