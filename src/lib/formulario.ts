import { useEffect } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ErroApi } from './erros'

/**
 * Mostra nos próprios campos os erros 400 devolvidos pela API (chaves em camelCase). Devolve true se algum
 * campo foi preenchido; caso contrário o chamador mostra `erro.mensagem` em um alerta (CT61).
 */
export function aplicarErrosDosCampos<T extends FieldValues>(erro: ErroApi, setError: UseFormSetError<T>, campos: readonly string[]): boolean {
  let aplicou = false
  for (const [chave, mensagens] of Object.entries(erro.campos)) {
    const campo = campos.find((c) => c.toLowerCase() === chave.toLowerCase())
    if (campo && mensagens[0]) {
      setError(campo as Path<T>, { type: 'server', message: mensagens[0] })
      aplicou = true
    }
  }
  return aplicou
}

const DESCRICAO_PADRAO = 'Viteme: divulgação, inscrição e acompanhamento dos eventos da faculdade. Encontre palestras, workshops, cursos, feiras e seminários.'

/** Cria, atualiza ou remove (valor null) uma tag do <head>. */
function definirTag(tag: 'meta' | 'link', atributo: string, chave: string, atributoValor: 'content' | 'href', valor: string | null) {
  let el = document.head.querySelector<HTMLElement>(`${tag}[${atributo}="${chave}"]`)
  if (valor === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement(tag)
    el.setAttribute(atributo, chave)
    document.head.appendChild(el)
  }
  el.setAttribute(atributoValor, valor)
}

export interface OpcoesSeo {
  /** false nas telas privadas (conta, inscrições, gestão): pede aos buscadores que não indexem. Padrão: true. */
  indexar?: boolean
  descricao?: string
  imagem?: string | null
}

/** Título da aba e metatags da tela (descrição, canonical, robots, Open Graph e Twitter), atualizadas a cada navegação. */
export function useTitulo(titulo: string, { indexar = true, descricao, imagem }: OpcoesSeo = {}) {
  useEffect(() => {
    const completo = `${titulo} • Viteme`
    const url = `${window.location.origin}${window.location.pathname}`
    const texto = descricao ?? DESCRICAO_PADRAO
    const foto = imagem && /^https:\/\//i.test(imagem) ? imagem : `${window.location.origin}/og.png`
    document.title = completo
    definirTag('meta', 'name', 'description', 'content', texto)
    definirTag('meta', 'name', 'robots', 'content', indexar ? 'index,follow,max-image-preview:large' : 'noindex,nofollow')
    definirTag('link', 'rel', 'canonical', 'href', url)
    definirTag('meta', 'property', 'og:title', 'content', completo)
    definirTag('meta', 'property', 'og:description', 'content', texto)
    definirTag('meta', 'property', 'og:url', 'content', url)
    definirTag('meta', 'property', 'og:image', 'content', foto)
    definirTag('meta', 'name', 'twitter:title', 'content', completo)
    definirTag('meta', 'name', 'twitter:description', 'content', texto)
    definirTag('meta', 'name', 'twitter:image', 'content', foto)
  }, [titulo, indexar, descricao, imagem])
}
