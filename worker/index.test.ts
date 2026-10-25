import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { montarRequisicaoParaApi, type Env } from './index'

const ASSETS = { fetch: vi.fn(async () => new Response('<html>spa</html>')) }
const env: Env = { ASSETS, API_ORIGIN: 'https://viteme-api.onrender.com/' }

afterEach(() => {
  vi.unstubAllGlobals()
  ASSETS.fetch.mockClear()
})

describe('montarRequisicaoParaApi', () => {
  it('mantém caminho, query e método, trocando só a origem', async () => {
    const r = await montarRequisicaoParaApi(new Request('https://viteme-web.exemplo.workers.dev/api/v1/eventos?busca=ia&pagina=2'), env.API_ORIGIN!)
    expect(r.url).toBe('https://viteme-api.onrender.com/api/v1/eventos?busca=ia&pagina=2')
    expect(r.method).toBe('GET')
  })

  it('repassa Authorization, Cookie, Origin e X-Requested-With, mas não cabeçalhos de conexão', async () => {
    const r = await montarRequisicaoParaApi(
      new Request('https://viteme-web.exemplo.workers.dev/api/v1/auth/renovar', {
        method: 'POST',
        headers: { Authorization: 'Bearer abc', Cookie: 'refresh_token=xyz', Origin: 'https://viteme-web.exemplo.workers.dev', 'X-Requested-With': 'viteme-web', Connection: 'keep-alive' },
      }),
      env.API_ORIGIN!,
    )
    expect(r.headers.get('authorization')).toBe('Bearer abc')
    expect(r.headers.get('cookie')).toBe('refresh_token=xyz')
    expect(r.headers.get('origin')).toBe('https://viteme-web.exemplo.workers.dev')
    expect(r.headers.get('x-requested-with')).toBe('viteme-web')
    expect(r.headers.get('connection')).toBeNull()
  })

  it('define o IP do cliente a partir do cabeçalho da Cloudflare e ignora X-Forwarded-For enviado pelo cliente', async () => {
    const r = await montarRequisicaoParaApi(
      new Request('https://viteme-web.exemplo.workers.dev/api/v1/auth/login', { method: 'POST', body: '{}', headers: { 'CF-Connecting-IP': '203.0.113.7', 'X-Forwarded-For': '1.2.3.4' } }),
      env.API_ORIGIN!,
    )
    expect(r.headers.get('x-forwarded-for')).toBe('203.0.113.7')
    expect(r.headers.get('x-forwarded-host')).toBe('viteme-web.exemplo.workers.dev')
    expect(r.headers.get('x-forwarded-proto')).toBe('https')
  })

  it('sem IP da Cloudflare não repassa o X-Forwarded-For do cliente', async () => {
    const r = await montarRequisicaoParaApi(new Request('https://x.workers.dev/api/v1/eventos', { headers: { 'X-Forwarded-For': '1.2.3.4' } }), env.API_ORIGIN!)
    expect(r.headers.get('x-forwarded-for')).toBeNull()
  })

  it('mantém o corpo das requisições com payload', async () => {
    const r = await montarRequisicaoParaApi(new Request('https://x.workers.dev/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.c' }), headers: { 'Content-Type': 'application/json' } }), env.API_ORIGIN!)
    expect(await r.json()).toEqual({ email: 'a@b.c' })
  })
})

describe('worker', () => {
  it('serve os arquivos estáticos pelo binding ASSETS', async () => {
    const resposta = await worker.fetch(new Request('https://x.workers.dev/minhas-inscricoes'), env)
    expect(ASSETS.fetch).toHaveBeenCalledOnce()
    expect(await resposta.text()).toContain('spa')
  })

  it('repassa /api/* para a API e devolve a resposta (inclusive Set-Cookie)', async () => {
    const upstream = new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'refresh_token=novo; Path=/api/v1/auth; Secure; HttpOnly; SameSite=None' } })
    const fetchFalso = vi.fn(async () => upstream)
    vi.stubGlobal('fetch', fetchFalso)

    const resposta = await worker.fetch(new Request('https://x.workers.dev/api/v1/auth/login', { method: 'POST', body: '{}' }), env)

    expect(ASSETS.fetch).not.toHaveBeenCalled()
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get('set-cookie')).toContain('refresh_token=novo')
    expect((fetchFalso.mock.calls[0] as unknown as [Request])[0].url).toBe('https://viteme-api.onrender.com/api/v1/auth/login')
  })

  it('devolve 502 quando a API não responde', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('falhou'))))
    const resposta = await worker.fetch(new Request('https://x.workers.dev/api/v1/eventos'), env)
    expect(resposta.status).toBe(502)
    expect(await resposta.json()).toMatchObject({ codigo: 'API_INDISPONIVEL' })
  })

  it('devolve 500 claro quando API_ORIGIN não está configurada', async () => {
    const resposta = await worker.fetch(new Request('https://x.workers.dev/api/v1/eventos'), { ASSETS })
    expect(resposta.status).toBe(500)
    expect(await resposta.json()).toMatchObject({ codigo: 'API_ORIGIN_AUSENTE' })
  })
})
