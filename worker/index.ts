/**
 * Worker do Cloudflare que serve o frontend e repassa /api/* para a API.
 *
 * Por quê: o site (*.workers.dev) e a API (Render, Azure…) ficam em sites diferentes, e navegadores com bloqueio de
 * cookies de terceiros não enviariam o cookie de renovação da sessão. Com o repasse, o navegador só fala com o
 * endereço do site: o cookie passa a ser de primeiro nível e o CORS deixa de ser necessário.
 *
 * Os arquivos estáticos (e o fallback da SPA) são servidos pelo binding ASSETS; só /api/* passa por este código
 * (`assets.run_worker_first` em wrangler.jsonc).
 */
export interface Env {
  ASSETS: { fetch(requisicao: Request): Promise<Response> }
  /** Endereço da API sem barra final, ex.: https://viteme-api.onrender.com (variável do Worker). */
  API_ORIGIN?: string
}

const PREFIXO_API = '/api/'

/** Cabeçalhos que não devem atravessar o repasse (de conexão ou controlados pela Cloudflare). */
const NAO_REPASSAR = ['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'content-length', 'cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto']

export async function montarRequisicaoParaApi(requisicao: Request, origemApi: string): Promise<Request> {
  const entrada = new URL(requisicao.url)
  const destino = new URL(entrada.pathname + entrada.search, origemApi.replace(/\/+$/, '') + '/')
  const cabecalhos = new Headers(requisicao.headers)
  for (const nome of NAO_REPASSAR) cabecalhos.delete(nome)

  // A API usa estes cabeçalhos (com Proxy__ConfiarEmCabecalhosEncaminhados=true) para o limite de requisições por IP.
  const ip = requisicao.headers.get('cf-connecting-ip')
  if (ip) cabecalhos.set('X-Forwarded-For', ip)
  cabecalhos.set('X-Forwarded-Host', entrada.host)
  cabecalhos.set('X-Forwarded-Proto', 'https')

  const temCorpo = requisicao.method !== 'GET' && requisicao.method !== 'HEAD'
  // Os corpos da API são JSON pequenos: ler inteiro evita a opção `duplex` exigida para repassar streams.
  const corpo = temCorpo ? await requisicao.arrayBuffer() : undefined
  return new Request(destino, { method: requisicao.method, headers: cabecalhos, body: corpo, redirect: 'manual' })
}

export default {
  async fetch(requisicao: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(requisicao.url)

    if (!pathname.startsWith(PREFIXO_API)) {
      return env.ASSETS.fetch(requisicao)
    }

    if (!env.API_ORIGIN) {
      return Response.json({ title: 'API não configurada', status: 500, detail: 'A variável API_ORIGIN do Worker não foi definida.', codigo: 'API_ORIGIN_AUSENTE' }, { status: 500 })
    }

    try {
      return await fetch(await montarRequisicaoParaApi(requisicao, env.API_ORIGIN))
    } catch {
      return Response.json({ title: 'API indisponível', status: 502, detail: 'Não foi possível falar com a API. Se ela estiver em hospedagem gratuita, pode estar iniciando; tente de novo em instantes.', codigo: 'API_INDISPONIVEL' }, { status: 502 })
    }
  },
}
