import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useTitulo } from '../lib/formulario'

const meta = (seletor: string) => document.head.querySelector<HTMLElement>(seletor)

afterEach(() => {
  document.head.querySelectorAll('meta[name], meta[property], link[rel="canonical"]').forEach((e) => e.remove())
})

describe('SEO no navegador (useTitulo)', () => {
  it('define título, descrição, canonical, robots e Open Graph', () => {
    renderHook(() => useTitulo('Explorar eventos'))
    expect(document.title).toBe('Explorar eventos • Viteme')
    expect(meta('meta[name="description"]')?.getAttribute('content')).toContain('Viteme')
    expect(meta('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow,max-image-preview:large')
    expect(meta('link[rel="canonical"]')?.getAttribute('href')).toBe(`${window.location.origin}${window.location.pathname}`)
    expect(meta('meta[property="og:title"]')?.getAttribute('content')).toBe('Explorar eventos • Viteme')
    expect(meta('meta[name="twitter:image"]')?.getAttribute('content')).toBe(`${window.location.origin}/og.png`)
  })

  it('telas privadas pedem noindex', () => {
    renderHook(() => useTitulo('Meu perfil', { indexar: false }))
    expect(meta('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow')
  })

  it('usa a descrição e a imagem https do evento; imagem insegura cai na padrão', () => {
    const { rerender } = renderHook(({ imagem }: { imagem: string }) => useTitulo('Evento', { descricao: 'Texto do evento', imagem }), { initialProps: { imagem: 'https://img.exemplo.com/a.jpg' } })
    expect(meta('meta[name="description"]')?.getAttribute('content')).toBe('Texto do evento')
    expect(meta('meta[property="og:image"]')?.getAttribute('content')).toBe('https://img.exemplo.com/a.jpg')
    rerender({ imagem: 'http://inseguro.com/a.jpg' })
    expect(meta('meta[property="og:image"]')?.getAttribute('content')).toBe(`${window.location.origin}/og.png`)
  })

  it('atualiza as tags existentes em vez de duplicá-las ao mudar de tela', () => {
    const { rerender } = renderHook(({ t }: { t: string }) => useTitulo(t), { initialProps: { t: 'A' } })
    rerender({ t: 'B' })
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(meta('meta[property="og:title"]')?.getAttribute('content')).toBe('B • Viteme')
  })
})
