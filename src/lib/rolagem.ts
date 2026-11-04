import { useEffect } from 'react'

/**
 * Publica o quanto a página já foi rolada (0 no topo, 1 no fim) na variável CSS `--rolagem`, que desloca o fundo em degradê.
 * Atualiza no máximo uma vez por quadro e recalcula quando a altura da página muda (cards chegando, troca de tela).
 * Com "reduzir movimento" ligado, o fundo fica parado no topo.
 */
export function useFundoComRolagem() {
  useEffect(() => {
    const raiz = document.documentElement
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let quadro = 0
    const atualizar = () => {
      quadro = 0
      const maximo = raiz.scrollHeight - window.innerHeight
      const progresso = maximo > 0 ? Math.min(1, Math.max(0, window.scrollY / maximo)) : 0
      raiz.style.setProperty('--rolagem', progresso.toFixed(4))
    }
    const pedir = () => {
      if (!quadro) quadro = window.requestAnimationFrame(atualizar)
    }

    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(pedir)
    observador?.observe(document.body)
    pedir()

    return () => {
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
      observador?.disconnect()
      if (quadro) window.cancelAnimationFrame(quadro)
      raiz.style.removeProperty('--rolagem')
    }
  }, [])
}
