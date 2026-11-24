import { useEffect, useState } from 'react'

export type Tema = 'claro' | 'escuro'

const CHAVE = 'viteme:tema'
const COR_DA_BARRA: Record<Tema, string> = { claro: '#0a7db3', escuro: '#06202e' }

const doSistema = (): Tema => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro')

/** Tema escolhido antes pelo usuário (o armazenamento pode estar bloqueado: nesse caso, não há escolha guardada). */
export function temaSalvo(): Tema | null {
  try {
    const valor = localStorage.getItem(CHAVE)
    return valor === 'claro' || valor === 'escuro' ? valor : null
  } catch {
    return null
  }
}

/** Aplica o tema na página (atributo no <html>, lido pelo CSS) e acerta a cor da barra do navegador no celular. */
export function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta, i) => {
    if (i > 0) return meta.remove()
    meta.removeAttribute('media')
    meta.setAttribute('content', COR_DA_BARRA[tema])
  })
}

/** Tema atual e o botão que alterna. Sem escolha guardada, segue a preferência do sistema (inclusive quando ela muda). */
export function useTema() {
  const [tema, setTema] = useState<Tema>(() => (document.documentElement.dataset.tema as Tema | undefined) ?? temaSalvo() ?? doSistema())

  useEffect(() => {
    const consulta = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!consulta) return
    const aoMudar = () => {
      if (!temaSalvo()) setTema(consulta.matches ? 'escuro' : 'claro')
    }
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  const alternar = () => {
    const novo: Tema = tema === 'escuro' ? 'claro' : 'escuro'
    setTema(novo)
    aplicarTema(novo)
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // Sem armazenamento: a escolha vale só até recarregar.
    }
  }

  return { tema, alternar }
}
