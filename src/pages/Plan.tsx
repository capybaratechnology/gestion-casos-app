import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertaBadge, EtapaBadge, FiscalSelector, Vacio } from '../components/ui'
import { useCasosFiltrados, useDatos } from '../lib/datos'
import { aDia, deDia, esFinDeSemana, fmt, fmtCorto, lunesDe } from '../lib/fechas'
import { planificar } from '../lib/planificador'
import { mensajeError } from '../lib/repo'
import type { CasoCalculado } from '../lib/tipos'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']

interface Semana {
  lunes: string
  casos: CasoCalculado[]
}

export default function Plan() {
  const d = useDatos()
  const casos = useCasosFiltrados()
  const [replan, setReplan] = useState(false)
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set([lunesDe(d.hoy)]))

  const feriados = useMemo(() => new Set(d.catalogos.feriados.map((f) => f.fecha)), [d.catalogos])
  const fiscalElegido = d.fiscales.find((f) => f.id === d.fiscalFiltro)
  const horasDia = fiscalElegido?.horas_equipo_dia ?? d.fiscales.reduce((s, f) => s + f.horas_equipo_dia, 0)

  const activos = casos.filter((c) => c.alerta !== 'concluido')
  const conPlan = casos.filter((c) => c.plan_inicio)
  const sinPlan = activos.filter((c) => !c.plan_inicio && c.avance !== 'listo')
  const atrasados = activos.filter((c) => c.plan_fin && c.plan_fin < d.hoy && c.avance !== 'listo')
  const pendientes = activos.filter((c) => c.avance !== 'listo')
  const horasPend = pendientes.reduce((s, c) => s + (c.horas_estimadas ?? 0), 0)
  const finPlan = pendientes.reduce<string | null>((m, c) => (c.plan_fin && (!m || c.plan_fin > m) ? c.plan_fin : m), null)

  const semanas = useMemo(() => {
    const mapa = new Map<string, CasoCalculado[]>()
    for (const c of conPlan) {
      const l = lunesDe(c.plan_inicio!)
      if (!mapa.has(l)) mapa.set(l, [])
      mapa.get(l)!.push(c)
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([lunes, cs]): Semana => ({ lunes, casos: cs.sort((a, b) => (a.plan_orden ?? 0) - (b.plan_orden ?? 0)) }))
  }, [conPlan])

  const laborables = (lunes: string) => {
    let n = 0
    for (let i = 0; i < 7; i++) {
      const dia = aDia(lunes) + i
      if (!esFinDeSemana(dia) && !feriados.has(deDia(dia))) n++
    }
    return n
  }

  const alternar = (l: string) =>
    setAbiertas((s) => {
      const n = new Set(s)
      if (n.has(l)) n.delete(l)
      else n.add(l)
      return n
    })

  let mesActual = ''

  return (
    <div className="pagina">
      <div className="pagina-cabecera">
        <h1>Plan de trabajo</h1>
        <FiscalSelector />
      </div>

      <section className="kpis">
        <div className="kpi">
          <span className="kpi-valor">{pendientes.length}</span>
          <span className="kpi-titulo">Casos por atender · {horasPend.toLocaleString('es-PE')} h</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor">{finPlan ? fmtCorto(finPlan) : '—'}</span>
          <span className="kpi-titulo">Fin previsto del plan</span>
        </div>
        <div className={`kpi ${atrasados.length ? 'kpi-rojo' : ''}`}>
          <span className="kpi-valor">{atrasados.length}</span>
          <span className="kpi-titulo">Atrasados respecto al plan</span>
        </div>
        <div className={`kpi ${sinPlan.length ? 'kpi-ambar' : ''}`}>
          <span className="kpi-valor">{sinPlan.length}</span>
          <span className="kpi-titulo">Sin fecha en el plan</span>
        </div>
      </section>

      {d.puedeCambiarEtapa && (
        <div className="acciones">
          <button className="btn primario" onClick={() => setReplan((v) => !v)}>
            {replan ? 'Cerrar' : 'Replanificar desde hoy'}
          </button>
          <span className="muted chico">Capacidad del equipo: {horasDia} h por día laborable</span>
        </div>
      )}

      {replan && <Replanificar cerrar={() => setReplan(false)} />}

      {atrasados.length > 0 && (
        <section className="tarjeta borde-rojo">
          <h2>Atrasados respecto al plan</h2>
          <ListaPlan casos={atrasados} />
        </section>
      )}

      {semanas.length === 0 && <Vacio>No hay casos con fecha de plan. Usa “Replanificar desde hoy”.</Vacio>}

      {semanas.map((s) => {
        const [y, m] = s.lunes.split('-')
        const mes = `${MESES[Number(m) - 1]} ${y}`
        const cabecera = mes !== mesActual ? ((mesActual = mes), <h2 className="mes">{mes}</h2>) : null
        const listos = s.casos.filter((c) => c.avance === 'listo' || c.alerta === 'concluido').length
        const horas = s.casos.reduce((t, c) => t + (c.horas_estimadas ?? 0), 0)
        const capacidad = laborables(s.lunes) * horasDia
        const actual = s.lunes === lunesDe(d.hoy)
        const pasada = deDia(aDia(s.lunes) + 6) < d.hoy
        return (
          <div key={s.lunes}>
            {cabecera}
            <section className={`tarjeta semana ${actual ? 'semana-actual' : ''}`}>
              <button className="semana-cabecera" onClick={() => alternar(s.lunes)} aria-expanded={abiertas.has(s.lunes)}>
                <span>
                  <strong>
                    {fmtCorto(s.lunes)} – {fmtCorto(deDia(aDia(s.lunes) + 4))}
                  </strong>
                  {actual && <span className="badge alerta-en_plazo">Esta semana</span>}
                </span>
                <span className="muted chico">
                  {listos}/{s.casos.length} listos · {horas} h de {capacidad} h
                </span>
              </button>
              <div className={`barra ${pasada && listos < s.casos.length ? 'barra-roja' : ''}`}>
                <span style={{ width: `${(listos / s.casos.length) * 100}%` }} />
              </div>
              {abiertas.has(s.lunes) && <ListaPlan casos={s.casos} />}
            </section>
          </div>
        )
      })}
    </div>
  )
}

function ListaPlan({ casos }: { casos: CasoCalculado[] }) {
  const d = useDatos()
  return (
    <ul className="lista-plan">
      {casos.map((c) => (
        <li key={c.id}>
          <input
            type="checkbox"
            checked={c.avance === 'listo' || c.alerta === 'concluido'}
            disabled={c.alerta === 'concluido'}
            onChange={(e) => d.actualizarCaso(c.id, { avance: e.target.checked ? 'listo' : 'en_proceso' }).catch(() => {})}
            aria-label={`Documento listo ${c.codigo}`}
          />
          <Link to={`/casos/${c.id}`} className="fila-caso">
            <span className="codigo">{c.codigo}</span>
            <EtapaBadge etapa={c.etapa} />
            <span className="muted chico">
              {fmtCorto(c.plan_inicio)}
              {c.plan_fin && c.plan_fin !== c.plan_inicio ? ` – ${fmtCorto(c.plan_fin)}` : ''} · {c.horas_estimadas ?? '?'} h
            </span>
            <span className="espacio" />
            <AlertaBadge c={c} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Replanificar({ cerrar }: { cerrar: () => void }) {
  const d = useDatos()
  const casos = useCasosFiltrados()
  const fiscal = d.fiscales.find((f) => f.id === d.fiscalFiltro)
  const [desde, setDesde] = useState(d.hoy)
  const [horasDia, setHorasDia] = useState(fiscal?.horas_equipo_dia ?? 24)
  const etapas = d.catalogos.etapas.filter((e) => !e.final)
  const [horas, setHoras] = useState<Record<string, number>>(() => Object.fromEntries(etapas.map((e) => [e.codigo, e.horas_preparacion ?? 8])))
  const [guardando, setGuardando] = useState(false)

  const resultado = useMemo(
    () => (fiscal ? planificar(casos, d.catalogos, { desde, horasDia, horasPorEtapa: horas }) : null),
    [fiscal, casos, d.catalogos, desde, horasDia, horas],
  )

  if (!fiscal) {
    return (
      <section className="tarjeta">
        <p>Elige un fiscal arriba para replanificar su despacho.</p>
      </section>
    )
  }

  async function guardar() {
    if (!resultado) return
    setGuardando(true)
    try {
      await d.guardarPlan(resultado.plan)
      cerrar()
    } catch (e) {
      d.avisar(`No se guardó: ${mensajeError(e)}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="tarjeta">
      <h2>Replanificar · Fiscal {fiscal.nombre}</h2>
      <p className="muted chico">
        Ordena los casos pendientes del más vencido al de mayor holgura y los reparte en días laborables (lunes a viernes, sin
        feriados). Los casos con documento listo o en etapa final no se mueven.
      </p>
      <div className="fila-campos campos-alineados">
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Horas del equipo por día
          <input type="number" min="1" value={horasDia} onChange={(e) => setHorasDia(Math.max(1, Number(e.target.value)))} />
        </label>
        {etapas.map((e) => (
          <label key={e.codigo}>
            Horas por caso · {e.nombre}
            <input type="number" min="0.5" step="0.5" value={horas[e.codigo]} onChange={(ev) => setHoras({ ...horas, [e.codigo]: Number(ev.target.value) })} />
          </label>
        ))}
      </div>
      {resultado && (
        <p>
          <strong>{resultado.plan.length} casos</strong>, {resultado.horas.toLocaleString('es-PE')} h de trabajo. Terminaría el{' '}
          <strong>{fmt(resultado.fin)}</strong>.
        </p>
      )}
      <div className="modal-acciones">
        <button className="btn" onClick={cerrar}>
          Cancelar
        </button>
        <button className="btn primario" onClick={guardar} disabled={guardando || !resultado?.plan.length}>
          {guardando ? 'Guardando…' : 'Guardar nuevo plan'}
        </button>
      </div>
    </section>
  )
}
