// Cloudflare Pages Function: mapa do site com as páginas públicas e todos os eventos publicados (busca na API a cada 1 h).
import { montarSitemap } from '../edge/seo'
import type { Env } from '../edge/proxy'

const TAMANHO_PAGINA = 50
const MAXIMO_DE_PAGINAS = 10

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const origem = new URL(request.url).origin
  const ids: string[] = []
  if (env.API_ORIGIN) {
    try {
      for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina += 1) {
        const r = await fetch(`${env.API_ORIGIN.replace(/\/+$/, '')}/api/v1/eventos?pagina=${pagina}&tamanhoPagina=${TAMANHO_PAGINA}`, { headers: { accept: 'application/json' } })
        if (!r.ok) break
        const dados = (await r.json()) as { itens?: { id: string }[]; total?: number }
        for (const e of dados.itens ?? []) if (typeof e.id === 'string') ids.push(e.id)
        if (!dados.itens?.length || pagina * TAMANHO_PAGINA >= (dados.total ?? 0)) break
      }
    } catch {
      // API fora do ar: o mapa sai só com as páginas fixas.
    }
  }
  return new Response(montarSitemap(origem, ids), { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=3600' } })
}
