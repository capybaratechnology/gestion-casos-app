import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useDatos } from '../lib/datos'
import { mensajeError } from '../lib/repo'
import type { Perfil, Rol } from '../lib/tipos'

export default function Usuarios() {
  const d = useDatos()
  const [perfiles, setPerfiles] = useState<Perfil[]>(d.perfiles)
  useEffect(() => setPerfiles(d.perfiles), [d.perfiles])

  if (d.perfil?.rol !== 'admin') return <Navigate to="/" replace />

  async function cambiar(p: Perfil, cambios: Partial<Perfil>) {
    try {
      await d.repo.actualizarPerfil(p.id, cambios)
      setPerfiles((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...cambios } : x)))
      d.avisar('Usuario actualizado')
    } catch (e) {
      d.avisar(`No se guardó: ${mensajeError(e)}`)
    }
  }

  return (
    <div className="pagina">
      <div className="pagina-cabecera">
        <h1>Usuarios</h1>
      </div>
      <p className="muted">
        Para agregar a alguien, invítalo desde Supabase (Authentication → Users → Invite). Aparecerá aquí como asistente sin
        despacho; asígnale rol y fiscal.
      </p>
      <div className="tabla-envoltura visible">
        <table className="tabla-casos">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Despacho</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {perfiles.map((p) => (
              <tr key={p.id}>
                <td>
                  <input defaultValue={p.nombre} onBlur={(e) => e.target.value !== p.nombre && cambiar(p, { nombre: e.target.value })} aria-label="Nombre" />
                </td>
                <td className="muted">{p.email ?? '—'}</td>
                <td>
                  <select value={p.rol} onChange={(e) => cambiar(p, { rol: e.target.value as Rol })} disabled={p.id === d.perfil?.id}>
                    <option value="admin">Admin</option>
                    <option value="fiscal">Fiscal</option>
                    <option value="asistente">Asistente</option>
                  </select>
                </td>
                <td>
                  <select value={p.fiscal_id ?? ''} onChange={(e) => cambiar(p, { fiscal_id: e.target.value || null })}>
                    <option value="">Sin despacho</option>
                    {d.fiscales.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input type="checkbox" checked={p.activo !== false} onChange={(e) => cambiar(p, { activo: e.target.checked })} disabled={p.id === d.perfil?.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
