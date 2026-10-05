import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { DatosProvider, useDatos } from './lib/datos'
import CasoDetalle from './pages/CasoDetalle'
import Casos from './pages/Casos'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Plan from './pages/Plan'
import Usuarios from './pages/Usuarios'

function Rutas() {
  const { perfil, cargando, error } = useDatos()

  if (cargando && !perfil) return <div className="cargando">Cargando…</div>
  if (!perfil) return <Login />
  if (!perfil.fiscal_id && perfil.rol !== 'admin') {
    return (
      <div className="login">
        <div className="login-caja">
          <h1>Hola, {perfil.nombre}</h1>
          <p>Tu cuenta aún no tiene un despacho asignado. Pide a la coordinación que te asigne a un fiscal.</p>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="casos" element={<Casos />} />
        <Route path="casos/:id" element={<CasoDetalle />} />
        <Route path="plan" element={<Plan />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <DatosProvider>
        <Rutas />
      </DatosProvider>
    </HashRouter>
  )
}
