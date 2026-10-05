import { Link, useNavigate } from 'react-router-dom'
import { AlertaBadge, AvanceBadge, EtapaBadge, FiscalSelector } from '../components/ui'
import { useCasosFiltrados, useDatos } from '../lib/datos'
import { aDia, deDia, fmtCorto, lunesDe } from '../lib/fechas'
import type { CasoCalculado } from '../lib/tipos'

export default function Panel() {
  const { catalogos, hoy, umbral, fiscales, fiscalFiltro } = useDatos()
  const casos = useCasosFiltrados()
  const nav = useNavigate()

  const activos = casos.filter((c) => c.alerta !== 'concluido')
  const cuenta = (f: (c: CasoCalculado) => boolean) => activos.filter(f).length
  const vencidos = cuenta((c) => c.alerta === 'vencido')
  const porVencer = cuenta((c) => c.alerta === 'por_vencer')
  const listos = cuenta((c) => c.avance === 'listo')

  const lunes = lunesDe(hoy)
  const domingo = deDia(aDia(lunes) + 6)
  const semana = casos.filter((c) => c.plan_inicio && c.plan_inicio >= lunes && c.plan_inicio <= domingo)
  const semanaListos = semana.filter((c) => c.avance === 'listo' || c.alerta === 'concluido').length
  const atrasadosPlan = activos.filter((c) => c.plan_fin && c.plan_fin < hoy && c.avance !== 'listo')

  const etapasActivas = catalogos.etapas.filter((e) => !e.final)
  const concluidos = casos.length - activos.length

  const fiscalDe = (id: string) => fiscales.find((f) => f.id === id)?.nombre.split(',')[0] ?? ''

  return (
    <div className="pagina">
      <div className="pagina-cabecera">
        <h1>Panel</h1>
        <FiscalSelector />
      </div>

      <section className="kpis">
        <button className="kpi" onClick={() => nav('/casos')}>
          <span className="kpi-valor">{activos.length}</span>
          <span className="kpi-titulo">Casos en trámite</span>
        </button>
        <button className="kpi kpi-rojo" onClick={() => nav('/casos?alerta=vencido')}>
          <span className="kpi-valor">{vencidos}</span>
          <span className="kpi-titulo">Vencidos</span>
        </button>
        <button className="kpi kpi-ambar" onClick={() => nav('/casos?alerta=por_vencer')}>
          <span className="kpi-valor">{porVencer}</span>
          <span className="kpi-titulo">Vencen en {umbral} días o menos</span>
        </button>
        <button className="kpi kpi-verde" onClick={() => nav('/casos?avance=listo')}>
          <span className="kpi-valor">{listos}</span>
          <span className="kpi-titulo">Documentos listos por firmar</span>
        </button>
      </section>

      <div className="grid-2">
        <section className="tarjeta">
          <h2>Por etapa</h2>
          <table className="tabla-resumen">
            <thead>
              <tr>
                <th>Etapa</th>
                <th className="num">Vencido</th>
                <th className="num">Por vencer</th>
                <th className="num">En plazo</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {etapasActivas.map((e) => {
                const de = activos.filter((c) => c.etapa === e.codigo)
                const n = (a: string) => de.filter((c) => c.alerta === a).length
                return (
                  <tr key={e.codigo} onClick={() => nav(`/casos?etapa=${encodeURIComponent(e.codigo)}`)} className="clic">
                    <td>{e.nombre}</td>
                    <td className="num rojo">{n('vencido') || ''}</td>
                    <td className="num ambar">{n('por_vencer') || ''}</td>
                    <td className="num">{n('en_plazo') || ''}</td>
                    <td className="num"><strong>{de.length}</strong></td>
                  </tr>
                )
              })}
              <tr className="fila-suave">
                <td>Concluidos (acusación, sobreseimiento, archivo)</td>
                <td colSpan={3} />
                <td className="num">{concluidos}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="tarjeta">
          <div className="tarjeta-cabecera">
            <h2>Plan de esta semana</h2>
            <Link to="/plan">Ver plan</Link>
          </div>
          <p className="muted">
            {fmtCorto(lunes)} al {fmtCorto(domingo)} · {semanaListos} de {semana.length} casos con documento listo
          </p>
          <div className="barra" aria-label="Avance de la semana">
            <span style={{ width: semana.length ? `${(semanaListos / semana.length) * 100}%` : 0 }} />
          </div>
          {atrasadosPlan.length > 0 && (
            <p className="alerta-texto">
              {atrasadosPlan.length} casos debían terminarse antes de hoy según el plan y siguen pendientes.
            </p>
          )}
        </section>
      </div>

      <section className="tarjeta">
        <div className="tarjeta-cabecera">
          <h2>Lo más urgente</h2>
          <Link to="/casos">Ver todos</Link>
        </div>
        <ul className="lista-simple">
          {activos.slice(0, 8).map((c) => (
            <li key={c.id}>
              <Link to={`/casos/${c.id}`} className="fila-caso">
                <span className="codigo">{c.codigo}</span>
                <EtapaBadge etapa={c.etapa} />
                <AvanceBadge avance={c.avance} />
                {!fiscalFiltro && <span className="muted chico">{fiscalDe(c.fiscal_id)}</span>}
                <span className="espacio" />
                <AlertaBadge c={c} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
