import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertaBadge, EtapaBadge, FiscalSelector, Icono, NOMBRE_ALERTA, Vacio } from '../components/ui'
import { useCasosFiltrados, useDatos } from '../lib/datos'
import { AVANCES } from '../lib/etapas'
import { fmt, fmtCorto } from '../lib/fechas'
import type { Alerta, Avance, CasoCalculado } from '../lib/tipos'

function AvanceSelect({ c }: { c: CasoCalculado }) {
  const { actualizarCaso } = useDatos()
  return (
    <select
      className={`avance-select avance-${c.avance}`}
      value={c.avance}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onChange={(e) => actualizarCaso(c.id, { avance: e.target.value as Avance }).catch(() => {})}
      aria-label="Avance"
      disabled={c.alerta === 'concluido'}
    >
      {AVANCES.map((a) => (
        <option key={a.valor} value={a.valor}>
          {a.nombre}
        </option>
      ))}
    </select>
  )
}

export default function Casos() {
  const { catalogos, perfil, perfiles, fiscales, cargando } = useDatos()
  const todos = useCasosFiltrados()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()

  const q = params.get('q') ?? ''
  const etapa = params.get('etapa') ?? ''
  const alerta = params.get('alerta') ?? ''
  const avance = params.get('avance') ?? ''
  const mios = params.get('mios') === '1'
  const orden = params.get('orden') ?? 'prioridad'

  const poner = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }

  const casos = useMemo(() => {
    const t = q.trim().toLowerCase()
    let r = todos.filter(
      (c) =>
        (!t || c.codigo.toLowerCase().includes(t) || c.estado.toLowerCase().includes(t) || (c.notas ?? '').toLowerCase().includes(t)) &&
        (!etapa || c.etapa === etapa) &&
        (alerta ? c.alerta === alerta : c.alerta !== 'concluido') &&
        (!avance || c.avance === avance) &&
        (!mios || c.responsable_id === perfil?.id),
    )
    if (orden === 'plan') r = [...r].sort((a, b) => (a.plan_inicio ?? '9999').localeCompare(b.plan_inicio ?? '9999') || (a.plan_orden ?? 0) - (b.plan_orden ?? 0))
    return r
  }, [todos, q, etapa, alerta, avance, mios, orden, perfil])

  const nombre = (id: string | null) => perfiles.find((p) => p.id === id)?.nombre ?? '—'
  const fiscalCorto = (id: string) => fiscales.find((f) => f.id === id)?.nombre.split(',')[0] ?? ''
  const ambos = !todos.every((c) => c.fiscal_id === todos[0]?.fiscal_id)

  return (
    <div className="pagina">
      <div className="pagina-cabecera">
        <h1>Casos</h1>
        <FiscalSelector />
      </div>

      <div className="filtros">
        <label className="buscador">
          <Icono n="buscar" size={18} />
          <input type="search" placeholder="Buscar por código, estado o nota" value={q} onChange={(e) => poner('q', e.target.value)} />
        </label>
        <select value={etapa} onChange={(e) => poner('etapa', e.target.value)} aria-label="Etapa">
          <option value="">Todas las etapas</option>
          {catalogos.etapas.map((e) => (
            <option key={e.codigo} value={e.codigo}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select value={alerta} onChange={(e) => poner('alerta', e.target.value)} aria-label="Plazo">
          <option value="">En trámite</option>
          {(Object.keys(NOMBRE_ALERTA) as Alerta[]).map((a) => (
            <option key={a} value={a}>
              {NOMBRE_ALERTA[a]}
            </option>
          ))}
        </select>
        <select value={avance} onChange={(e) => poner('avance', e.target.value)} aria-label="Avance">
          <option value="">Todo avance</option>
          {AVANCES.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.nombre}
            </option>
          ))}
        </select>
        <select value={orden} onChange={(e) => poner('orden', e.target.value === 'prioridad' ? '' : e.target.value)} aria-label="Orden">
          <option value="prioridad">Orden: urgencia</option>
          <option value="plan">Orden: plan</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={mios} onChange={(e) => poner('mios', e.target.checked ? '1' : '')} />
          Asignados a mí
        </label>
      </div>

      <p className="muted">{casos.length} casos</p>

      {!cargando && casos.length === 0 && <Vacio>No hay casos con esos filtros.</Vacio>}

      {/* Tarjetas (móvil) */}
      <ul className="tarjetas-casos">
        {casos.map((c) => (
          <li key={c.id}>
            <div className="tarjeta-caso clic" role="link" tabIndex={0} onClick={() => nav(`/casos/${c.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/casos/${c.id}`)}>
              <div className="fila">
                <span className="codigo">{c.codigo}</span>
                <AlertaBadge c={c} />
              </div>
              <div className="fila">
                <EtapaBadge etapa={c.etapa} />
                {ambos && <span className="muted chico">{fiscalCorto(c.fiscal_id)}</span>}
              </div>
              <div className="muted chico">{c.estado}</div>
              <div className="fila">
                <span className="chico">
                  Vence {fmt(c.vencimiento)} · Plan {fmtCorto(c.plan_inicio)}
                </span>
                <AvanceSelect c={c} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Tabla (escritorio) */}
      <div className="tabla-envoltura">
        <table className="tabla-casos">
          <thead>
            <tr>
              <th>Caso</th>
              {ambos && <th>Fiscal</th>}
              <th>Etapa / estado</th>
              <th>Inicio</th>
              <th>Vence</th>
              <th>Plazo</th>
              <th>Plan</th>
              <th>Responsable</th>
              <th>Avance</th>
            </tr>
          </thead>
          <tbody>
            {casos.map((c) => (
              <tr key={c.id} className="clic" onClick={() => nav(`/casos/${c.id}`)}>
                <td className="codigo">{c.codigo}</td>
                {ambos && <td>{fiscalCorto(c.fiscal_id)}</td>}
                <td>
                  <EtapaBadge etapa={c.etapa} />
                  <div className="muted chico">{c.estado}</div>
                </td>
                <td>{fmt(c.fecha_inicio_etapa)}</td>
                <td>{fmt(c.vencimiento)}</td>
                <td>
                  <AlertaBadge c={c} />
                </td>
                <td>{c.plan_inicio ? `${fmtCorto(c.plan_inicio)}${c.plan_fin && c.plan_fin !== c.plan_inicio ? ` – ${fmtCorto(c.plan_fin)}` : ''}` : '—'}</td>
                <td>{nombre(c.responsable_id)}</td>
                <td>
                  <AvanceSelect c={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
