export type Rol = 'admin' | 'fiscal' | 'asistente'
export type Avance = 'pendiente' | 'en_proceso' | 'listo'
export type TipoDias = 'habiles' | 'calendario'
export type Alerta = 'vencido' | 'por_vencer' | 'en_plazo' | 'concluido'

export interface Fiscal {
  id: string
  nombre: string
  horas_equipo_dia: number
}

export interface Perfil {
  id: string
  nombre: string
  email?: string | null
  rol: Rol
  fiscal_id: string | null
  activo?: boolean
}

export interface Caso {
  id: string
  codigo: string
  fiscal_id: string
  n_reporte: string | null
  etapa: string
  estado: string
  fecha_inicio_etapa: string // YYYY-MM-DD
  plazo_dias: number | null
  tipo_dias: TipoDias
  avance: Avance
  responsable_id: string | null
  notas: string | null
  plan_orden: number | null
  plan_inicio: string | null
  plan_fin: string | null
  horas_estimadas: number | null
  apoyo_otro_equipo: boolean
  actualizado_en?: string
}

export interface Movimiento {
  id: number | string
  caso_id: string
  tipo: 'etapa' | 'estado' | 'avance' | 'responsable' | 'plan' | 'nota'
  valor_anterior: string | null
  valor_nuevo: string | null
  nota: string | null
  creado_por: string | null
  creado_en: string
  autor?: string | null
}

export interface Etapa {
  codigo: string
  nombre: string
  orden: number
  plazo_defecto: number | null
  tipo_dias: TipoDias
  horas_preparacion: number | null
  final: boolean
}

export interface Transicion {
  origen: string
  destino: string
  documento: string
  horas_min: number
  horas_max: number
}

export interface Feriado {
  fecha: string
  descripcion: string
}

export interface Catalogos {
  etapas: Etapa[]
  transiciones: Transicion[]
  feriados: Feriado[]
}

export interface CambioEtapa {
  etapa: string
  estado: string
  fecha_inicio: string
  plazo: number | null
  nota: string
}

export interface PlanCaso {
  id: string
  plan_orden: number | null
  plan_inicio: string | null
  plan_fin: string | null
  horas_estimadas: number | null
}

/** Caso con los cálculos de vencimiento que hace la app. */
export interface CasoCalculado extends Caso {
  vencimiento: string | null
  dias_restantes: number | null
  alerta: Alerta
}
