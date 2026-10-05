import type { ReactNode } from 'react'
import { useDatos } from '../lib/datos'
import { nombreAvance, nombreEtapa } from '../lib/etapas'
import { textoDias } from '../lib/fechas'
import type { Alerta, Avance, CasoCalculado } from '../lib/tipos'

export const NOMBRE_ALERTA: Record<Alerta, string> = {
  vencido: 'Vencido',
  por_vencer: 'Por vencer',
  en_plazo: 'En plazo',
  concluido: 'Concluido',
}

export function AlertaBadge({ c }: { c: CasoCalculado }) {
  return (
    <span className={`badge alerta-${c.alerta}`}>
      {c.alerta === 'concluido' ? 'Concluido' : textoDias(c.dias_restantes)}
    </span>
  )
}

export function EtapaBadge({ etapa }: { etapa: string }) {
  const { catalogos } = useDatos()
  const clase = etapa.toLowerCase().replace(/\s+/g, '-')
  return <span className={`badge etapa etapa-${clase}`}>{nombreEtapa(catalogos, etapa)}</span>
}

export function AvanceBadge({ avance }: { avance: Avance }) {
  return <span className={`badge avance-${avance}`}>{nombreAvance(avance)}</span>
}

export function FiscalSelector() {
  const { perfil, fiscales, fiscalFiltro, setFiscalFiltro } = useDatos()
  if (perfil?.rol !== 'admin') {
    const f = fiscales.find((x) => x.id === perfil?.fiscal_id)
    return f ? <span className="fiscal-fijo">Fiscal {f.nombre}</span> : null
  }
  return (
    <select className="fiscal-select" value={fiscalFiltro} onChange={(e) => setFiscalFiltro(e.target.value)} aria-label="Fiscal">
      <option value="">Ambos fiscales</option>
      {fiscales.map((f) => (
        <option key={f.id} value={f.id}>
          {f.nombre}
        </option>
      ))}
    </select>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="vacio">{children}</div>
}

const RUTAS: Record<string, string> = {
  panel: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  casos: 'M4 6h16M4 12h16M4 18h10',
  plan: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm3 7h3v3H8z',
  usuarios: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  salir: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  atras: 'M15 18l-6-6 6-6',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  recargar: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  sol: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  luna: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
}

export function Icono({ n, size = 20 }: { n: keyof typeof RUTAS; size?: number }) {
  const relleno = n === 'panel' || n === 'luna'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={relleno ? 'currentColor' : 'none'} stroke={relleno ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={RUTAS[n]} />
    </svg>
  )
}
