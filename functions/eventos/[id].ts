// Cloudflare Pages Function: devolve o HTML do site com título, descrição, Open Graph e dados estruturados do evento já preenchidos
// (para buscadores, IAs e prévias de links que não executam JavaScript). Se a API falhar, serve o HTML normal do site.
import { injetarNoHtml, paginaDoEvento, type EventoSeo } from '../../edge/seo'
import type { Env } from '../../edge/proxy'

type Contexto = { request: Request; env: Env & { ASSETS: { fetch(request: Request): Promise<Response> } }; params: { id?: string | string[] }; next: () => Promise<Response> }

const ID_VALIDO = /^[0-9a-f-]{36}$/i

export const onRequest = async ({ request, env, params, next }: Contexto): Promise<Response> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next()
  const url = new URL(request.url)
  const casca = await env.ASSETS.fetch(new Request(new URL('/', url)))
  const html = await casca.text()
  const normal = () => new Response(html, { status: casca.status, headers: casca.headers })

  const id = String(params.id ?? '')
  if (!env.API_ORIGIN || !ID_VALIDO.test(id)) return normal()
  try {
    const resposta = await fetch(`${env.API_ORIGIN.replace(/\/+$/, '')}/api/v1/eventos/${id}`, { headers: { accept: 'application/json' } })
    // Evento que não existe: status 404 de verdade (buscadores tratam 200 com "não encontrado" como erro), com o HTML do site
    // para a tela de "não encontrado" continuar aparecendo.
    if (resposta.status === 404) return new Response(html, { status: 404, headers: casca.headers })
    if (!resposta.ok) return normal()
    const evento = (await resposta.json()) as EventoSeo
    const cabecalhos = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' })
    return new Response(injetarNoHtml(html, paginaDoEvento(evento, url.origin)), { status: 200, headers: cabecalhos })
  } catch {
    return normal()
  }
}
