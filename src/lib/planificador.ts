import { aDia, compararPrioridad, deDia, laborableDesde } from './fechas'
import type { CasoCalculado, Catalogos, PlanCaso } from './tipos'

export interface OpcionesPlan {
  desde: string
  horasDia: number // capacidad del equipo del fiscal (fiscal + asistentes)
  horasPorEtapa: Record<string, number>
}

export interface ResultadoPlan {
  plan: PlanCaso[]
  horas: number
  fin: string | null
}

/**
 * Reparte los casos pendientes del despacho en días laborables, del más atrasado al
 * que tiene más holgura, llenando la capacidad diaria del equipo.
 * Los casos en etapa final o con el documento listo no se replanifican.
 */
export function planificar(casos: CasoCalculado[], cat: Catalogos, op: OpcionesPlan): ResultadoPlan {
  const feriados = new Set(cat.feriados.map((f) => f.fecha))
  const pendientes = casos
    .filter((c) => c.alerta !== 'concluido' && c.avance !== 'listo')
    .sort(compararPrioridad)

  let dia = laborableDesde(aDia(op.desde), feriados)
  let usado = 0
  let total = 0
  const plan: PlanCaso[] = []

  pendientes.forEach((c, i) => {
    const horas = op.horasPorEtapa[c.etapa] ?? c.horas_estimadas ?? 8
    if (usado >= op.horasDia) {
      dia = laborableDesde(dia + 1, feriados)
      usado = 0
    }
    const inicio = dia
    let resta = horas
    while (resta > 0) {
      if (usado >= op.horasDia) {
        dia = laborableDesde(dia + 1, feriados)
        usado = 0
      }
      const toma = Math.min(resta, op.horasDia - usado)
      usado += toma
      resta -= toma
    }
    total += horas
    plan.push({ id: c.id, plan_orden: i + 1, plan_inicio: deDia(inicio), plan_fin: deDia(dia), horas_estimadas: horas })
  })

  return { plan, horas: total, fin: plan.length ? plan[plan.length - 1].plan_fin : null }
}
