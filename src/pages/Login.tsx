import { useState, type FormEvent } from 'react'
import { useDatos } from '../lib/datos'
import { mensajeError } from '../lib/repo'
import { USUARIOS_DEMO, entrarDemo, reiniciarDemo } from '../lib/repoDemo'

export default function Login() {
  const { repo, error } = useDatos()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [fallo, setFallo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setFallo(null)
    try {
      await repo.entrar(email.trim(), clave)
    } catch (err) {
      setFallo(mensajeError(err) === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <div className="login-caja">
        <div className="marca grande">
          <span className="logo">GC</span>
          <div>
            <h1>Gestión de Casos</h1>
            <p className="muted">Planificación y seguimiento de la fiscalía</p>
          </div>
        </div>

        {repo.modo === 'supabase' ? (
          <form onSubmit={enviar} className="form">
            <label>
              Correo
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Contraseña
              <input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
            </label>
            {(fallo || error) && <p className="error">{fallo || error}</p>}
            <button className="btn primario" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
            <p className="muted chico">Las cuentas las crea la coordinación desde Supabase.</p>
          </form>
        ) : (
          <div className="form">
            <p>
              <strong>Modo demo.</strong> Elige con qué usuario entrar para ver la app como cada rol. Los datos son los 254 casos
              de los reportes al 25/09/2026.
            </p>
            <div className="lista-demo">
              {USUARIOS_DEMO.map((u) => (
                <button key={u.id} className="btn" onClick={() => entrarDemo(u.id)}>
                  {u.nombre}
                  <small>{u.rol}</small>
                </button>
              ))}
            </div>
            <button className="btn-link" onClick={() => confirm('¿Borrar los cambios de la demo y volver a los datos iniciales?') && reiniciarDemo()}>
              Reiniciar datos de la demo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
