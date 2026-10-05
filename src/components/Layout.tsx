import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useDatos } from '../lib/datos'
import { useTema } from '../lib/tema'
import { Icono } from './ui'

const ROLES = { admin: 'Admin', fiscal: 'Fiscal', asistente: 'Asistente' }

export default function Layout() {
  const { perfil, repo, aviso, recargar, cargando } = useDatos()
  const { tema, alternar } = useTema()
  const [enLinea, setEnLinea] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setEnLinea(true)
    const off = () => setEnLinea(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const enlaces = [
    { a: '/', n: 'panel' as const, t: 'Panel' },
    { a: '/casos', n: 'casos' as const, t: 'Casos' },
    { a: '/plan', n: 'plan' as const, t: 'Plan' },
    ...(perfil?.rol === 'admin' ? [{ a: '/usuarios', n: 'usuarios' as const, t: 'Usuarios' }] : []),
  ]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="marca">
          <span className="logo">GC</span>
          <span>Gestión de Casos</span>
        </div>
        <nav>
          {enlaces.map((e) => (
            <NavLink key={e.a} to={e.a} end={e.a === '/'} className="nav-item">
              <Icono n={e.n} />
              <span>{e.t}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-pie">
          <div className="usuario">
            <strong>{perfil?.nombre}</strong>
            <small>{perfil ? ROLES[perfil.rol] : ''}{repo.modo === 'demo' ? ' · demo' : ''}</small>
          </div>
          <button className="btn-icono" onClick={alternar} title={tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'} aria-label="Cambiar tema">
            <Icono n={tema === 'oscuro' ? 'sol' : 'luna'} />
          </button>
          <button className="btn-icono" onClick={() => repo.salir()} title="Salir" aria-label="Salir">
            <Icono n="salir" />
          </button>
        </div>
      </aside>

      <header className="topbar">
        <span className="logo">GC</span>
        <strong>Gestión de Casos</strong>
        <span className="espacio" />
        <button className="btn-icono" onClick={alternar} title={tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'} aria-label="Cambiar tema">
          <Icono n={tema === 'oscuro' ? 'sol' : 'luna'} />
        </button>
        <button className="btn-icono" onClick={() => recargar()} disabled={cargando} aria-label="Actualizar">
          <Icono n="recargar" />
        </button>
        <button className="btn-icono" onClick={() => repo.salir()} aria-label="Salir">
          <Icono n="salir" />
        </button>
      </header>

      <main className="contenido">
        {!enLinea && <div className="banda-offline">Sin conexión: ves la última copia guardada; los cambios no se guardarán hasta reconectar.</div>}
        {repo.modo === 'demo' && <div className="banda-demo">Modo demo: los cambios se guardan solo en este navegador. Conecta Supabase para compartirlos.</div>}
        <Outlet />
      </main>

      <nav className="bottombar">
        {enlaces.map((e) => (
          <NavLink key={e.a} to={e.a} end={e.a === '/'} className="tab">
            <Icono n={e.n} size={22} />
            <span>{e.t}</span>
          </NavLink>
        ))}
      </nav>

      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  )
}
