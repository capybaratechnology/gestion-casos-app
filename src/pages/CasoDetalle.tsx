import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertaBadge, EtapaBadge, Icono, Vacio } from '../components/ui'
import { useDatos } from '../lib/datos'
import { AVANCES, ESTADOS_SUGERIDOS, documentoPendiente, etapaDe, nombreAvance, nombreEtapa, siguientes } from '../lib/etapas'
import { fmt, fmtFechaHora } from '../lib/fechas'
import { mensajeError } from '../lib/repo'
import type { CasoCalculado, Movimiento, Transicion } from '../lib/tipos'

export default function CasoDetalle() {
  const { id } = useParams()
  const d = useDatos()
  const c = d.casos.find((x) => x.id === id)
  const [historial, setHistorial] = useState<Movimiento[]>([])
  const [transicion, setTransicion] = useState<Transicion | null>(null)

  const cargarHistorial = useCallback(async () => {
    if (!id) return
    try {
      setHistorial(await d.repo.historial(id))
    } catch {
      setHistorial([])
    }
  }, [id, d.repo])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial, c?.actualizado_en])

  if (!c) {
    return (
      <div className="pagina">
        <Link to="/casos" className="volver">
          <Icono n="atras" size={18} /> Casos
        </Link>
        <Vacio>{d.cargando ? 'Cargando…' : 'No se encontró el caso o no tienes acceso.'}</Vacio>
      </div>
    )
  }

  const etapa = etapaDe(d.catalogos, c.etapa)
  const opciones = siguientes(d.catalogos, c.etapa)
  const fiscal = d.fiscales.find((f) => f.id === c.fiscal_id)
  const equipo = d.perfiles.filter((p) => p.fiscal_id === c.fiscal_id && p.activo !== false)
  const estados = Array.from(new Set([c.estado, ...(ESTADOS_SUGERIDOS[c.etapa] ?? [])]))

  return (
    <div className="pagina detalle">
      <Link to="/casos" className="volver">
        <Icono n="atras" size={18} /> Casos
      </Link>

      <div className="detalle-cabecera">
        <div>
          <h1 className="codigo">{c.codigo}</h1>
          <p className="muted">
            Fiscal {fiscal?.nombre ?? '—'}
            {c.n_reporte && ` · N° ${c.n_reporte} del reporte`}
          </p>
        </div>
        <div className="fila">
          <EtapaBadge etapa={c.etapa} />
          <AlertaBadge c={c} />
        </div>
      </div>

      <div className="grid-2">
        <section className="tarjeta">
          <h2>Plazo</h2>
          <dl className="datos">
            <dt>Etapa</dt>
            <dd>{nombreEtapa(d.catalogos, c.etapa)}</dd>
            <dt>Estado</dt>
            <dd>{c.estado}</dd>
            <dt>Inicio de etapa</dt>
            <dd>{fmt(c.fecha_inicio_etapa)}</dd>
            <dt>Plazo</dt>
            <dd>{c.plazo_dias ? `${c.plazo_dias} días ${c.tipo_dias === 'habiles' ? 'hábiles' : 'calendario'}` : '—'}</dd>
            <dt>Vence</dt>
            <dd>{fmt(c.vencimiento)}</dd>
          </dl>
          {!etapa?.final && (
            <p className="muted chico">Documento a preparar: {documentoPendiente(d.catalogos, c.etapa)}</p>
          )}
        </section>

        <section className="tarjeta">
          <h2>Seguimiento</h2>
          <div className="segmentado" role="radiogroup" aria-label="Avance">
            {AVANCES.map((a) => (
              <button
                key={a.valor}
                role="radio"
                aria-checked={c.avance === a.valor}
                className={c.avance === a.valor ? `activo avance-${a.valor}` : ''}
                disabled={etapa?.final}
                onClick={() => d.actualizarCaso(c.id, { avance: a.valor }).catch(() => {})}
              >
                {a.nombre}
              </button>
            ))}
          </div>

          <label>
            Responsable
            <select value={c.responsable_id ?? ''} onChange={(e) => d.actualizarCaso(c.id, { responsable_id: e.target.value || null }).catch(() => {})}>
              <option value="">Sin asignar</option>
              {equipo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estado en el sistema fiscal
            <select value={c.estado} onChange={(e) => d.actualizarCaso(c.id, { estado: e.target.value }).catch(() => {})}>
              {estados.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          <Plan c={c} />
        </section>
      </div>

      {opciones.length > 0 && (
        <section className="tarjeta">
          <h2>Cambiar etapa</h2>
          {d.puedeCambiarEtapa ? (
            <div className="opciones-etapa">
              {opciones.map((t) => (
                <button key={t.destino} className="btn opcion-etapa" onClick={() => setTransicion(t)}>
                  <strong>{nombreEtapa(d.catalogos, t.destino)}</strong>
                  <small>
                    {t.documento} · {t.horas_min === t.horas_max ? `${t.horas_min} h` : `${t.horas_min} a ${t.horas_max} h`}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">El fiscal cambia la etapa. Marca el avance como “{nombreAvance('listo')}” cuando el documento esté preparado.</p>
          )}
        </section>
      )}

      <Notas c={c} />

      <section className="tarjeta">
        <h2>Historial</h2>
        <NuevaNota casoId={c.id} alGuardar={cargarHistorial} />
        {historial.length === 0 ? (
          <p className="muted">Sin movimientos todavía.</p>
        ) : (
          <ol className="historial">
            {historial.map((m) => (
              <li key={m.id}>
                <span className="muted chico">
                  {fmtFechaHora(m.creado_en)} · {m.autor ?? 'sistema'}
                </span>
                <span>{describir(m, d.catalogos)}</span>
                {m.nota && m.tipo !== 'nota' && <em className="chico">“{m.nota}”</em>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {transicion && <DialogoEtapa c={c} t={transicion} cerrar={() => setTransicion(null)} />}
    </div>
  )
}

function describir(m: Movimiento, cat: Parameters<typeof nombreEtapa>[0]) {
  switch (m.tipo) {
    case 'etapa':
      return `Etapa: ${nombreEtapa(cat, m.valor_anterior ?? '')} → ${nombreEtapa(cat, m.valor_nuevo ?? '')}`
    case 'avance':
      return `Avance: ${nombreAvance((m.valor_anterior ?? 'pendiente') as never)} → ${nombreAvance((m.valor_nuevo ?? 'pendiente') as never)}`
    case 'responsable':
      return `Responsable: ${m.valor_nuevo ?? 'sin asignar'}`
    case 'estado':
      return `Estado: ${m.valor_nuevo}`
    case 'nota':
      return m.nota
    default:
      return `${m.tipo}: ${m.valor_nuevo ?? ''}`
  }
}

function Plan({ c }: { c: CasoCalculado }) {
  const d = useDatos()
  const [inicio, setInicio] = useState(c.plan_inicio ?? '')
  const [fin, setFin] = useState(c.plan_fin ?? '')
  const [horas, setHoras] = useState(c.horas_estimadas?.toString() ?? '')
  useEffect(() => {
    setInicio(c.plan_inicio ?? '')
    setFin(c.plan_fin ?? '')
    setHoras(c.horas_estimadas?.toString() ?? '')
  }, [c.plan_inicio, c.plan_fin, c.horas_estimadas])

  const cambiado = inicio !== (c.plan_inicio ?? '') || fin !== (c.plan_fin ?? '') || horas !== (c.horas_estimadas?.toString() ?? '')

  return (
    <div className="plan-caso">
      <div className="fila-campos">
        <label>
          Plan: inicio
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label>
          Fin
          <input type="date" value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} />
        </label>
        <label>
          Horas
          <input type="number" min="0" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} />
        </label>
      </div>
      {c.apoyo_otro_equipo && <p className="muted chico">Planificado con apoyo del equipo del otro fiscal.</p>}
      {cambiado && (
        <button
          className="btn primario"
          onClick={() =>
            d
              .actualizarCaso(c.id, { plan_inicio: inicio || null, plan_fin: fin || inicio || null, horas_estimadas: horas ? Number(horas) : null })
              .then(() => d.avisar('Plan del caso guardado'))
              .catch(() => {})
          }
        >
          Guardar plan
        </button>
      )}
    </div>
  )
}

function Notas({ c }: { c: CasoCalculado }) {
  const d = useDatos()
  const [texto, setTexto] = useState(c.notas ?? '')
  useEffect(() => setTexto(c.notas ?? ''), [c.notas])
  return (
    <section className="tarjeta">
      <h2>Notas del caso</h2>
      <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Diligencias pendientes, contactos, recordatorios…" />
      {texto !== (c.notas ?? '') && (
        <button className="btn primario" onClick={() => d.actualizarCaso(c.id, { notas: texto || null }).then(() => d.avisar('Notas guardadas')).catch(() => {})}>
          Guardar notas
        </button>
      )}
    </section>
  )
}

function NuevaNota({ casoId, alGuardar }: { casoId: string; alGuardar: () => void }) {
  const d = useDatos()
  const [texto, setTexto] = useState('')
  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    try {
      await d.agregarNota(casoId, texto.trim())
      setTexto('')
      alGuardar()
    } catch (err) {
      d.avisar(`No se guardó: ${mensajeError(err)}`)
    }
  }
  return (
    <form className="nueva-nota" onSubmit={enviar}>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Agregar una anotación al historial" />
      <button className="btn" disabled={!texto.trim()}>
        Agregar
      </button>
    </form>
  )
}

function DialogoEtapa({ c, t, cerrar }: { c: CasoCalculado; t: Transicion; cerrar: () => void }) {
  const d = useDatos()
  const destino = etapaDe(d.catalogos, t.destino)
  const sugeridos = ESTADOS_SUGERIDOS[t.destino] ?? []
  const [estado, setEstado] = useState(sugeridos[sugeridos.length - 1] ?? '')
  const [fecha, setFecha] = useState(d.hoy)
  const [plazo, setPlazo] = useState(destino?.plazo_defecto?.toString() ?? '')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await d.cambiarEtapa(c.id, { etapa: t.destino, estado, fecha_inicio: fecha, plazo: plazo ? Number(plazo) : null, nota })
      cerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fondo" onClick={cerrar}>
      <form className="modal" onSubmit={confirmar} onClick={(e) => e.stopPropagation()}>
        <h2>
          {nombreEtapa(d.catalogos, c.etapa)} → {nombreEtapa(d.catalogos, t.destino)}
        </h2>
        <p className="muted">
          {t.documento}. Tiempo estimado de preparación: {t.horas_min === t.horas_max ? `${t.horas_min} h` : `${t.horas_min} a ${t.horas_max} h`}.
        </p>
        <label>
          Estado
          <input list="estados-sugeridos" value={estado} onChange={(e) => setEstado(e.target.value)} required />
          <datalist id="estados-sugeridos">
            {sugeridos.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <div className="fila-campos">
          <label>
            {destino?.final ? 'Fecha del documento' : 'Inicio de la nueva etapa'}
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          {!destino?.final && (
            <label>
              Plazo ({destino?.tipo_dias === 'habiles' ? 'días hábiles' : 'días'})
              <input type="number" min="1" value={plazo} onChange={(e) => setPlazo(e.target.value)} required />
            </label>
          )}
        </div>
        <label>
          Nota (opcional)
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. N° de disposición" />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-acciones">
          <button type="button" className="btn" onClick={cerrar}>
            Cancelar
          </button>
          <button className="btn primario" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Cambiar etapa'}
          </button>
        </div>
      </form>
    </div>
  )
}
