import { useEffect, useState } from 'react'

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'tema'

function leerGuardado(): Tema | null {
  const v = localStorage.getItem(CLAVE)
  return v === 'claro' || v === 'oscuro' ? v : null
}

function preferenciaSistema(): Tema {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

function aplicar(tema: Tema | null) {
  if (tema) document.documentElement.setAttribute('data-tema', tema)
  else document.documentElement.removeAttribute('data-tema')
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(() => leerGuardado() ?? preferenciaSistema())

  useEffect(() => {
    aplicar(leerGuardado())
  }, [])

  const alternar = () => {
    const siguiente: Tema = tema === 'oscuro' ? 'claro' : 'oscuro'
    setTema(siguiente)
    localStorage.setItem(CLAVE, siguiente)
    aplicar(siguiente)
  }

  return { tema, alternar }
}
