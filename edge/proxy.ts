/**
 * Repasse de /api/* para a API, usado pela Function do Cloudflare Pages (functions/api/[[path]].ts).
 *
 * Por quê: o site (*.pages.dev) e a API (Render, Azure…) ficam em sites diferentes, e navegadores com bloqueio de
 * cookies de terceiros não enviariam o cookie de renovação da sessão. Com o repasse, o navegador só fala com o
 * endereço do site: o cookie passa a ser de primeiro nível e o CORS deixa de ser necessário.
 */
export interface Env {
  /** Endereço da API sem barra final, ex.: https://viteme-api-f5f3f2b8eacdbehp.westus3-01.azurewebsites.net (variável do projeto no painel do Pages; local: .dev.vars). */
  API_ORIGIN?: string
}

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

/** Repassa a requisição à API e devolve a resposta (inclusive Set-Cookie); erros viram ProblemDetails claros. */
export async function repassarParaApi(requisicao: Request, env: Env): Promise<Response> {
  if (!env.API_ORIGIN) {
    return Response.json({ title: 'API não configurada', status: 500, detail: 'A variável API_ORIGIN do projeto não foi definida.', codigo: 'API_ORIGIN_AUSENTE' }, { status: 500 })
  }

  try {
    return await fetch(await montarRequisicaoParaApi(requisicao, env.API_ORIGIN))
  } catch {
    return Response.json({ title: 'API indisponível', status: 502, detail: 'Não foi possível falar com a API. Se ela estiver em hospedagem gratuita, pode estar iniciando; tente de novo em instantes.', codigo: 'API_INDISPONIVEL' }, { status: 502 })
  }
}
