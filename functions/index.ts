// Cloudflare Pages Function da página inicial: HTML do site com metatags, dados estruturados e a lista dos próximos eventos
// em <noscript> (para robôs que não executam JavaScript). Se a API falhar, serve o HTML normal do site.
import { injetarNoHtml, paginaDaHome, type ResumoSeo } from '../edge/seo'
import type { Env } from '../edge/proxy'

type Contexto = { request: Request; env: Env & { ASSETS: { fetch(request: Request): Promise<Response> } }; next: () => Promise<Response> }

export const onRequest = async ({ request, env, next }: Contexto): Promise<Response> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next()
  const url = new URL(request.url)
  const casca = await env.ASSETS.fetch(new Request(new URL('/', url)))
  const html = await casca.text()
  const normal = () => new Response(html, { status: casca.status, headers: casca.headers })

  if (!env.API_ORIGIN) return normal()
  try {
    const resposta = await fetch(`${env.API_ORIGIN.replace(/\/+$/, '')}/api/v1/eventos?pagina=1&tamanhoPagina=12`, { headers: { accept: 'application/json' } })
    if (!resposta.ok) return normal()
    const { itens } = (await resposta.json()) as { itens: ResumoSeo[] }
    const cabecalhos = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600' })
    return new Response(injetarNoHtml(html, paginaDaHome(Array.isArray(itens) ? itens : [], url.origin)), { status: 200, headers: cabecalhos })
  } catch {
    return normal()
  }
}
