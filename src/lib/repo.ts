import type { CambioEtapa, Caso, Catalogos, Fiscal, Movimiento, Perfil, PlanCaso } from './tipos'

/** Acceso a datos: Supabase en producción o almacenamiento local en modo demo. */
export interface Repo {
  modo: 'supabase' | 'demo'
  perfilActual(): Promise<Perfil | null>
  alCambiarSesion(cb: () => void): () => void
  entrar(email: string, clave: string): Promise<void>
  salir(): Promise<void>
  catalogos(): Promise<Catalogos>
  fiscales(): Promise<Fiscal[]>
  perfiles(): Promise<Perfil[]>
  casos(): Promise<Caso[]>
  historial(casoId: string): Promise<Movimiento[]>
  actualizarCaso(id: string, cambios: Partial<Caso>): Promise<Caso>
  cambiarEtapa(id: string, cambio: CambioEtapa): Promise<Caso>
  agregarNota(casoId: string, nota: string): Promise<void>
  guardarPlan(plan: PlanCaso[]): Promise<void>
  actualizarPerfil(id: string, cambios: Partial<Perfil>): Promise<void>
  /** Avisa cuando otro usuario cambia un caso. Devuelve la función para cancelar. */
  escucharCasos(cb: (c: Caso) => void): () => void
}

export function mensajeError(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}
